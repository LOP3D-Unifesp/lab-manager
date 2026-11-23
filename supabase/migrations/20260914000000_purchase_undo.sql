-- The coordinator can step a purchase request back, to fix a mistake:
--   delivered -> purchased -> approved -> requested     rejected -> requested     cancelled -> requested
-- Going back clears what the undone step recorded (delivery date, purchase date and amount paid, decision).

create or replace function public.set_purchase_status(
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
    or (v_request.status = 'approved' and p_status in ('purchased', 'cancelled', 'requested'))
    or (v_request.status = 'purchased' and p_status in ('delivered', 'approved'))
    or (v_request.status = 'delivered' and p_status = 'purchased')
    or (v_request.status in ('rejected', 'cancelled') and p_status = 'requested')
  ) then
    raise exception 'invalid_purchase_transition' using errcode = 'P0001';
  end if;

  if p_status = 'requested' then
    update public.purchase_requests
    set status = 'requested', decided_by = null, decided_at = null, rejected_reason = null
    where id = p_request_id returning * into v_request;
  elsif p_status = 'approved' then
    -- From requested it records the decision; from purchased it only undoes the purchase.
    update public.purchase_requests
    set status = 'approved',
        decided_by = case when v_request.status = 'requested' then auth.uid() else decided_by end,
        decided_at = case when v_request.status = 'requested' then now() else decided_at end,
        purchased_at = null,
        actual_amount = null
    where id = p_request_id returning * into v_request;
  elsif p_status = 'rejected' then
    update public.purchase_requests
    set status = 'rejected', decided_by = auth.uid(), decided_at = now(),
        rejected_reason = nullif(btrim(coalesce(p_reason, '')), '')
    where id = p_request_id returning * into v_request;
  elsif p_status = 'purchased' then
    -- From approved it records the purchase; from delivered it only undoes the delivery.
    update public.purchase_requests
    set status = 'purchased',
        purchased_at = case when v_request.status = 'approved' then now() else purchased_at end,
        actual_amount = coalesce(p_actual_amount, actual_amount, estimated_amount),
        delivered_at = null
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
