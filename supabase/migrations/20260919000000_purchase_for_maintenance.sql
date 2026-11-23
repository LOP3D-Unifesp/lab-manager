-- Marks a purchase as a maintenance expense (parts, repairs), independent of the funding line (rubrica), so the
-- spending on maintenance can be followed. A purchase made from a maintenance request is always a maintenance
-- expense; any other purchase can be marked by hand while it waits for a decision.

alter table public.purchase_requests add column for_maintenance boolean default false not null;

update public.purchase_requests set for_maintenance = true where maintenance_request_id is not null;

create function private.purchase_maintenance_flag() returns trigger
language plpgsql
as $$
begin
  if new.maintenance_request_id is not null then
    new.for_maintenance := true;
  end if;
  return new;
end;
$$;
alter function private.purchase_maintenance_flag() owner to postgres;

create trigger purchase_requests_maintenance_flag before insert or update on public.purchase_requests
    for each row execute function private.purchase_maintenance_flag();

-- Same function with one more optional argument (null keeps the current value), so callers that do not send it keep working.
drop function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid);
create function public.update_purchase_request(
  p_request_id uuid,
  p_item text,
  p_url text,
  p_quantity integer,
  p_estimated_amount numeric,
  p_notes text default null,
  p_funding_category public.project_funding_category default null,
  p_urgency public.purchase_urgency default null,
  p_set_project boolean default false,
  p_project_id uuid default null,
  p_for_maintenance boolean default null
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

  if p_set_project
     and p_project_id is distinct from v_request.project_id
     and not private.can_request_purchase(p_project_id) then
    raise exception 'project_not_available' using errcode = 'P0001';
  end if;

  update public.purchase_requests
  set item = btrim(p_item),
      url = nullif(btrim(coalesce(p_url, '')), ''),
      quantity = p_quantity,
      estimated_amount = p_estimated_amount,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      funding_category = coalesce(p_funding_category, funding_category),
      urgency = coalesce(p_urgency, urgency),
      project_id = case when p_set_project then p_project_id else project_id end,
      for_maintenance = coalesce(p_for_maintenance, for_maintenance)
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean) from public;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean) to authenticated;
