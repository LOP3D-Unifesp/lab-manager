-- A maintenance purchase can name the equipment it is for, with or without an open maintenance request (spare parts
-- are also bought while nothing is broken). A purchase made from a request always takes the equipment of that request;
-- a purchase that is not a maintenance expense has no equipment.

alter table public.purchase_requests
    add column equipment_id uuid,
    add constraint purchase_requests_equipment_id_fkey
        foreign key (equipment_id) references public.equipment (id) on delete set null;

create index purchase_requests_equipment_idx on public.purchase_requests (equipment_id)
    where equipment_id is not null;

create or replace function private.purchase_maintenance_flag() returns trigger
language plpgsql
as $$
begin
  if new.maintenance_request_id is not null then
    new.for_maintenance := true;
    select r.equipment_id into new.equipment_id
    from public.maintenance_requests r
    where r.id = new.maintenance_request_id;
  elsif not new.for_maintenance then
    new.equipment_id := null;
  end if;
  return new;
end;
$$;

-- Requests already linked to a maintenance request get its equipment.
update public.purchase_requests p
set equipment_id = r.equipment_id
from public.maintenance_requests r
where r.id = p.maintenance_request_id;

-- Same function with two more optional arguments, so callers that do not send them keep the current equipment.
drop function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean);
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
  p_for_maintenance boolean default null,
  p_set_equipment boolean default false,
  p_equipment_id uuid default null
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
      for_maintenance = coalesce(p_for_maintenance, for_maintenance),
      equipment_id = case when p_set_equipment then p_equipment_id else equipment_id end
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean, boolean, uuid) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean, boolean, uuid) from public, anon;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid, boolean, boolean, uuid) to authenticated;
