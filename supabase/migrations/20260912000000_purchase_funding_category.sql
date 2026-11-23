-- A purchase request says which funding line (rubrica) the item belongs to: capital (equipment and permanent
-- material), custeio (consumables and services), reserva tecnica or outros. Scholarships (bolsas) are not purchases.
-- Requests made before this migration keep it empty.

alter table public.purchase_requests
    add column funding_category public.project_funding_category,
    add constraint purchase_requests_funding_category_check check (funding_category is null or funding_category <> 'bolsas');

-- New requests must choose one.
drop policy "members open purchase requests" on public.purchase_requests;
create policy "members open purchase requests" on public.purchase_requests
    for insert to authenticated
    with check (
        requested_by = auth.uid()
        and funding_category is not null
        and status = 'requested'
        and decided_by is null
        and decided_at is null
        and rejected_reason is null
        and actual_amount is null
        and purchased_at is null
        and delivered_at is null
        and private.can_request_purchase(project_id)
    );

-- Same function with one more optional argument (null keeps the current funding line), so callers that do not
-- send it keep working.
drop function public.update_purchase_request(uuid, text, text, integer, numeric, text);
create function public.update_purchase_request(
  p_request_id uuid,
  p_item text,
  p_url text,
  p_quantity integer,
  p_estimated_amount numeric,
  p_notes text default null,
  p_funding_category public.project_funding_category default null
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
      funding_category = coalesce(p_funding_category, funding_category)
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
alter function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category) owner to postgres;
revoke all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category) from public;
grant all on function public.update_purchase_request(uuid, text, text, integer, numeric, text, public.project_funding_category) to authenticated;
