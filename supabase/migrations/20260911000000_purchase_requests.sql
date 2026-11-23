-- Purchase requests: a researcher asks to buy something for a project (item, link, estimated value); the
-- coordinator approves or rejects, then marks it as purchased and delivered.
--   requested -> approved -> purchased -> delivered
--   requested -> rejected | cancelled      approved -> cancelled
-- Visible to the author, the members of the project and the coordinator.

create type public.purchase_status as enum ('requested', 'approved', 'rejected', 'purchased', 'delivered', 'cancelled');
alter type public.purchase_status owner to postgres;

create table public.purchase_requests (
    id uuid default gen_random_uuid() not null,
    project_id uuid not null,
    requested_by uuid default auth.uid(),
    item text not null,
    url text,
    quantity integer default 1 not null,
    -- Estimated total (quantity included), in BRL.
    estimated_amount numeric(12, 2) not null,
    notes text,
    status public.purchase_status default 'requested' not null,
    decided_by uuid,
    decided_at timestamp with time zone,
    rejected_reason text,
    actual_amount numeric(12, 2),
    purchased_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint purchase_requests_pkey primary key (id),
    constraint purchase_requests_project_id_fkey foreign key (project_id) references public.projects (id) on delete restrict,
    constraint purchase_requests_requested_by_fkey foreign key (requested_by) references public.profiles (id) on delete set null,
    constraint purchase_requests_decided_by_fkey foreign key (decided_by) references public.profiles (id) on delete set null,
    constraint purchase_requests_item_check check (length(btrim(item)) between 2 and 200),
    constraint purchase_requests_url_check check (url is null or (length(url) <= 2000 and url ~* '^https?://[^[:space:]]+$')),
    constraint purchase_requests_quantity_check check (quantity between 1 and 100000),
    constraint purchase_requests_estimated_amount_check check (estimated_amount >= 0 and estimated_amount < 100000000),
    constraint purchase_requests_actual_amount_check check (actual_amount is null or (actual_amount >= 0 and actual_amount < 100000000)),
    constraint purchase_requests_notes_check check (notes is null or length(notes) <= 1000),
    constraint purchase_requests_reason_check check (rejected_reason is null or length(rejected_reason) <= 500)
);
alter table public.purchase_requests owner to postgres;
create index purchase_requests_status_created_idx on public.purchase_requests (status, created_at desc);
create index purchase_requests_project_idx on public.purchase_requests (project_id);
create index purchase_requests_requested_by_idx on public.purchase_requests (requested_by);
create trigger purchase_requests_touch_updated_at before update on public.purchase_requests
    for each row execute function public.touch_updated_at();

-- Anyone active can request for an open project they belong to; the coordinator for any open project.
create function private.can_request_purchase(p_project_id uuid) returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select private.has_active_profile()
    and exists (select 1 from public.projects where id = p_project_id and status in ('planning', 'active', 'paused'))
    and (private.is_coordinator() or private.is_project_member(p_project_id));
$$;
alter function private.can_request_purchase(uuid) owner to postgres;
revoke all on function private.can_request_purchase(uuid) from public;
grant all on function private.can_request_purchase(uuid) to authenticated;

alter table public.purchase_requests enable row level security;
create policy "authors members and coordinators read purchases" on public.purchase_requests
    for select to authenticated
    using (private.has_active_profile() and (requested_by = auth.uid() or private.can_read_project(project_id)));
create policy "members open purchase requests" on public.purchase_requests
    for insert to authenticated
    with check (
        requested_by = auth.uid()
        and status = 'requested'
        and decided_by is null
        and decided_at is null
        and rejected_reason is null
        and actual_amount is null
        and purchased_at is null
        and delivered_at is null
        and private.can_request_purchase(project_id)
    );
-- No direct update or delete: edits and status changes go through the functions below.
grant select, insert on table public.purchase_requests to authenticated;
grant all on table public.purchase_requests to service_role;

-- The author (or the coordinator) edits a request while nobody decided on it.
create function public.update_purchase_request(
  p_request_id uuid,
  p_item text,
  p_url text,
  p_quantity integer,
  p_estimated_amount numeric,
  p_notes text default null
) returns public.purchase_requests
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.purchase_requests;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_request from public.purchase_requests where id = p_request_id for update;

  if not found then
    raise exception 'purchase_not_found' using errcode = 'P0001';
  end if;

  if not (v_request.requested_by = auth.uid() or private.is_coordinator()) then
    raise exception 'purchase_forbidden' using errcode = 'P0001';
  end if;

  if v_request.status <> 'requested' then
    raise exception 'purchase_not_editable' using errcode = 'P0001';
  end if;

  update public.purchase_requests
  set item = btrim(p_item),
      url = nullif(btrim(coalesce(p_url, '')), ''),
      quantity = p_quantity,
      estimated_amount = p_estimated_amount,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text) from public;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text) to authenticated;

-- Coordinator: approve, reject (with a reason), mark as purchased (with the amount paid) and delivered.
-- The author may only cancel while the request is still waiting for a decision.
create function public.set_purchase_status(
  p_request_id uuid,
  p_status public.purchase_status,
  p_reason text default null,
  p_actual_amount numeric default null
) returns public.purchase_requests
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.purchase_requests;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_request from public.purchase_requests where id = p_request_id for update;

  if not found then
    raise exception 'purchase_not_found' using errcode = 'P0001';
  end if;

  if p_status = v_request.status then
    return v_request;
  end if;

  if not private.is_coordinator()
     and not (v_request.requested_by = auth.uid() and v_request.status = 'requested' and p_status = 'cancelled') then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if not (
    (v_request.status = 'requested' and p_status in ('approved', 'rejected', 'cancelled'))
    or (v_request.status = 'approved' and p_status in ('purchased', 'cancelled'))
    or (v_request.status = 'purchased' and p_status = 'delivered')
  ) then
    raise exception 'invalid_purchase_transition' using errcode = 'P0001';
  end if;

  if p_status = 'approved' then
    update public.purchase_requests
    set status = 'approved', decided_by = auth.uid(), decided_at = now()
    where id = p_request_id returning * into v_request;
  elsif p_status = 'rejected' then
    update public.purchase_requests
    set status = 'rejected', decided_by = auth.uid(), decided_at = now(),
        rejected_reason = nullif(btrim(coalesce(p_reason, '')), '')
    where id = p_request_id returning * into v_request;
  elsif p_status = 'purchased' then
    update public.purchase_requests
    set status = 'purchased', purchased_at = now(), actual_amount = coalesce(p_actual_amount, estimated_amount)
    where id = p_request_id returning * into v_request;
  elsif p_status = 'delivered' then
    update public.purchase_requests
    set status = 'delivered', delivered_at = now()
    where id = p_request_id returning * into v_request;
  else
    update public.purchase_requests
    set status = 'cancelled'
    where id = p_request_id returning * into v_request;
  end if;

  return v_request;
end;
$$;
alter function public.set_purchase_status(uuid, public.purchase_status, text, numeric) owner to postgres;
revoke all on function public.set_purchase_status(uuid, public.purchase_status, text, numeric) from public;
grant all on function public.set_purchase_status(uuid, public.purchase_status, text, numeric) to authenticated;

-- The coordinator is warned of new requests in real time (RLS still limits what each person receives).
alter publication supabase_realtime add table public.purchase_requests;
