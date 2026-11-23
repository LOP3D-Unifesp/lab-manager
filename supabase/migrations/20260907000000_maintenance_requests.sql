-- Maintenance requests: anyone reports a problem with an equipment, and the people marked as
-- maintainers (plus coordinators) take it, work on it and resolve it. Maintainers can also put
-- equipment in maintenance and release it, which until now was coordinator-only.

alter table public.profiles add column is_maintainer boolean default false not null;

-- Coordinator or maintainer, with an active profile.
create function private.can_maintain() returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
      and (role = 'coordinator' or is_maintainer)
  );
$$;
alter function private.can_maintain() owner to postgres;
revoke all on function private.can_maintain() from public;
grant all on function private.can_maintain() to authenticated;

create type public.maintenance_urgency as enum ('low', 'normal', 'urgent');
alter type public.maintenance_urgency owner to postgres;

create type public.maintenance_request_status as enum ('open', 'in_progress', 'resolved', 'cancelled');
alter type public.maintenance_request_status owner to postgres;

create table public.maintenance_requests (
    id uuid default gen_random_uuid() not null,
    equipment_id uuid not null,
    requested_by uuid default auth.uid(),
    description text not null,
    urgency public.maintenance_urgency default 'normal' not null,
    status public.maintenance_request_status default 'open' not null,
    assigned_to uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint maintenance_requests_pkey primary key (id),
    constraint maintenance_requests_equipment_id_fkey foreign key (equipment_id) references public.equipment (id) on delete restrict,
    constraint maintenance_requests_requested_by_fkey foreign key (requested_by) references public.profiles (id) on delete set null,
    constraint maintenance_requests_assigned_to_fkey foreign key (assigned_to) references public.profiles (id) on delete set null,
    constraint maintenance_requests_description_check check (length(btrim(description)) between 3 and 2000)
);
alter table public.maintenance_requests owner to postgres;
create index maintenance_requests_equipment_status_idx on public.maintenance_requests (equipment_id, status);
create index maintenance_requests_status_created_idx on public.maintenance_requests (status, created_at desc);
create trigger maintenance_requests_touch_updated_at before update on public.maintenance_requests
    for each row execute function public.touch_updated_at();

alter table public.maintenance_requests enable row level security;
-- Everyone reads, so people see that a problem was already reported instead of reporting it twice.
create policy "active users read maintenance requests" on public.maintenance_requests
    for select to authenticated using (private.has_active_profile());
create policy "active users open maintenance requests" on public.maintenance_requests
    for insert to authenticated
    with check (
        private.has_active_profile()
        and requested_by = auth.uid()
        and status = 'open'
        and assigned_to is null
        and resolution_notes is null
        and resolved_at is null
    );
-- Status changes only through the function below.
grant select, insert on table public.maintenance_requests to authenticated;
grant all on table public.maintenance_requests to service_role;

-- open -> in_progress (take it), in_progress -> resolved, open/in_progress -> cancelled,
-- in_progress -> open (give it back), open/resolved -> reopened or resolved directly. Cancelled is final.
-- Maintainers and coordinators do any of these; the person who opened a request may only cancel it
-- while it is still open.
create function public.set_maintenance_request_status(
  p_request_id uuid,
  p_status public.maintenance_request_status,
  p_resolution_notes text default null,
  p_assigned_to uuid default null
) returns public.maintenance_requests
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.maintenance_requests;
  v_assignee uuid;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_request from public.maintenance_requests where id = p_request_id for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;

  if p_status = v_request.status then
    return v_request;
  end if;

  if not private.can_maintain()
     and not (v_request.requested_by = auth.uid() and v_request.status = 'open' and p_status = 'cancelled') then
    raise exception 'maintainer_required' using errcode = 'P0001';
  end if;

  if v_request.status = 'cancelled' then
    raise exception 'invalid_request_transition' using errcode = 'P0001';
  end if;

  if p_status = 'in_progress' then
    v_assignee := coalesce(p_assigned_to, auth.uid());
    if not exists (
      select 1 from public.profiles
      where id = v_assignee and is_active and (role = 'coordinator' or is_maintainer)
    ) then
      raise exception 'invalid_assignee' using errcode = 'P0001';
    end if;

    update public.maintenance_requests
    set status = 'in_progress', assigned_to = v_assignee, resolved_at = null
    where id = p_request_id
    returning * into v_request;
  elsif p_status = 'resolved' then
    update public.maintenance_requests
    set status = 'resolved',
        resolved_at = now(),
        resolution_notes = nullif(btrim(coalesce(p_resolution_notes, '')), ''),
        assigned_to = coalesce(assigned_to, auth.uid())
    where id = p_request_id
    returning * into v_request;
  elsif p_status = 'open' then
    update public.maintenance_requests
    set status = 'open', assigned_to = null, resolved_at = null
    where id = p_request_id
    returning * into v_request;
  else
    update public.maintenance_requests
    set status = 'cancelled'
    where id = p_request_id
    returning * into v_request;
  end if;

  return v_request;
end;
$$;
alter function public.set_maintenance_request_status(uuid, public.maintenance_request_status, text, uuid) owner to postgres;
revoke all on function public.set_maintenance_request_status(uuid, public.maintenance_request_status, text, uuid) from public;
grant all on function public.set_maintenance_request_status(uuid, public.maintenance_request_status, text, uuid) to authenticated;

-- Maintainers can now put equipment in maintenance and release it (coordinators still can). The error
-- code for everyone else changes from coordinator_required to maintainer_required.
create or replace function public.start_equipment_maintenance(
  p_equipment_id uuid,
  p_reason text,
  p_notes text default null,
  p_expected_return_on date default null,
  p_cancel_bookings boolean default false
) returns public.equipment_maintenance
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
  v_episode public.equipment_maintenance;
begin
  if not private.can_maintain() then
    raise exception 'maintainer_required' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  select * into v_equipment from public.equipment where id = p_equipment_id for update;

  if not found then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  if v_equipment.status = 'maintenance'
     or exists (select 1 from public.equipment_maintenance where equipment_id = p_equipment_id and ended_at is null) then
    raise exception 'maintenance_already_open' using errcode = 'P0001';
  end if;

  insert into public.equipment_maintenance (equipment_id, reason, notes, expected_return_on)
  values (
    p_equipment_id,
    btrim(p_reason),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_expected_return_on
  )
  returning * into v_episode;

  update public.equipment set status = 'maintenance' where id = p_equipment_id;

  if coalesce(p_cancel_bookings, false) then
    update public.equipment_bookings
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = auth.uid()
    where equipment_id = p_equipment_id
      and status in ('pending', 'approved')
      and starts_at > now();
  end if;

  return v_episode;
end;
$$;

-- Releasing also resolves the requests someone was already working on for that equipment.
create or replace function public.end_equipment_maintenance(p_equipment_id uuid, p_notes text default null)
returns public.equipment_maintenance
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
  v_episode public.equipment_maintenance;
begin
  if not private.can_maintain() then
    raise exception 'maintainer_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  select * into v_equipment from public.equipment where id = p_equipment_id for update;

  if not found then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  update public.equipment_maintenance
  set ended_at = now(),
      ended_by = auth.uid(),
      resolution_notes = nullif(btrim(coalesce(p_notes, '')), '')
  where equipment_id = p_equipment_id and ended_at is null
  returning * into v_episode;

  if v_episode.id is null and v_equipment.status <> 'maintenance' then
    raise exception 'not_in_maintenance' using errcode = 'P0001';
  end if;

  update public.equipment set status = 'active' where id = p_equipment_id;

  update public.maintenance_requests
  set status = 'resolved',
      resolved_at = now(),
      resolution_notes = coalesce(resolution_notes, nullif(btrim(coalesce(p_notes, '')), ''))
  where equipment_id = p_equipment_id and status = 'in_progress';

  return v_episode;
end;
$$;
