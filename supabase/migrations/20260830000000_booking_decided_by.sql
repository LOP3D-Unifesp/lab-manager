-- Record who approved / rejected a booking, mirroring cancelled_by, so the
-- researcher's notifications and history can show the decision author.
-- The foreign keys also let PostgREST embed the profile names.

alter table public.printer_bookings
  add column if not exists approved_by uuid
    references public.profiles(id),
  add column if not exists rejected_by uuid
    references public.profiles(id);

create index if not exists printer_bookings_approved_by_idx on public.printer_bookings (approved_by);
create index if not exists printer_bookings_rejected_by_idx on public.printer_bookings (rejected_by);

comment on column public.printer_bookings.approved_by
  is 'Profile that approved a pending booking; null on auto-approved bookings.';
comment on column public.printer_bookings.rejected_by
  is 'Profile (coordinator) that rejected a pending booking.';

create or replace function private.reject_printer_booking_internal(
  p_booking_id uuid,
  p_reason text default null
) returns public.printer_bookings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_booking public.printer_bookings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.printer_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'invalid_booking_status_transition' using errcode = 'P0001';
  end if;

  update public.printer_bookings
  set status = 'rejected',
      rejected_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      rejected_at = now(),
      rejected_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.reject_printer_booking(
  p_booking_id uuid,
  p_reason text default null
) returns public.printer_bookings
language sql
security definer
set search_path = public, private
as $$
  select private.reject_printer_booking_internal(p_booking_id, p_reason);
$$;

create or replace function public.set_printer_booking_status(
  p_booking_id uuid,
  p_status public.booking_status
) returns public.printer_bookings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_booking public.printer_bookings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.printer_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_status = v_booking.status then
    return v_booking;
  end if;

  if p_status = 'cancelled' then
    return private.cancel_printer_booking_internal(p_booking_id);
  end if;

  if p_status = 'rejected' then
    return private.reject_printer_booking_internal(p_booking_id, null);
  end if;

  if not (
    (v_booking.status = 'pending' and p_status = 'approved')
    or (v_booking.status = 'approved' and p_status = 'in_progress')
    or (v_booking.status = 'in_progress' and p_status in ('completed', 'failed'))
  ) then
    raise exception 'invalid_booking_status_transition' using errcode = 'P0001';
  end if;

  -- Operational states only make sense close to (or after) the booking window.
  -- A small grace window keeps the coordinator from finishing prints that only
  -- start days from now while allowing same-day operational flexibility.
  if p_status in ('in_progress', 'completed', 'failed')
     and now() < v_booking.starts_at - interval '1 hour' then
    raise exception 'booking_not_started' using errcode = 'P0001';
  end if;

  update public.printer_bookings
  set status = p_status,
      approved_at = case
        when v_booking.status = 'pending' and p_status = 'approved' then now()
        else v_booking.approved_at
      end,
      approved_by = case
        when v_booking.status = 'pending' and p_status = 'approved' then auth.uid()
        else v_booking.approved_by
      end
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function private.reject_printer_booking_internal(uuid, text) from public;
revoke all on function public.reject_printer_booking(uuid, text) from public;
revoke all on function public.set_printer_booking_status(uuid, public.booking_status) from public;

grant execute on function public.reject_printer_booking(uuid, text) to authenticated;
grant execute on function public.set_printer_booking_status(uuid, public.booking_status) to authenticated;
