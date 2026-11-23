-- How urgent a purchase request is: low, normal (default) or urgent. It helps the coordinator decide what to
-- handle first. Requests made before this migration are normal.

create type public.purchase_urgency as enum ('low', 'normal', 'urgent');
alter type public.purchase_urgency owner to postgres;

alter table public.purchase_requests
    add column urgency public.purchase_urgency default 'normal' not null;

-- Same function with one more optional argument (null keeps the current urgency), so callers that do not send it
-- keep working.
drop function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category);
create function public.update_purchase_request(
  p_request_id uuid,
  p_item text,
  p_url text,
  p_quantity integer,
  p_estimated_amount numeric,
  p_notes text default null,
  p_funding_category public.project_funding_category default null,
  p_urgency public.purchase_urgency default null
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
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      funding_category = coalesce(p_funding_category, funding_category),
      urgency = coalesce(p_urgency, urgency)
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency) from public;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category, public.purchase_urgency) to authenticated;
