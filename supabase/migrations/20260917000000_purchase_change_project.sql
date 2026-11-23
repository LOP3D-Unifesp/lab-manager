-- While a purchase request is still waiting for a decision, the author (or the coordinator) can move it to another
-- project or to the lab general stock. The new destination must be one the person could request for.
-- A separate flag says "change the project" because a null project means the general stock.

drop function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency);
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
  p_project_id uuid default null
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
      project_id = case when p_set_project then p_project_id else project_id end
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid) from public;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency, boolean, uuid) to authenticated;
