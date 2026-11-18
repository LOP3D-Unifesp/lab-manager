-- Booking lifecycle rule fixes: rejection RPC, temporal validation on status
-- transitions, editing approved bookings whose start already passed, and
-- retroactive maintenance blocks.

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
      rejected_at = now()
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
  set status = p_status
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function private.update_printer_booking_internal(
  p_booking_id uuid,
  p_printer_id uuid,
  p_material_id uuid,
  p_project_name text,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
) returns public.printer_bookings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_booking public.printer_bookings;
  v_printer public.printers;
  v_ends_at timestamptz;
  v_old_lock integer;
  v_new_lock integer;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.printer_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if not private.is_coordinator() and v_booking.profile_id <> auth.uid() then
    raise exception 'booking_forbidden' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('pending', 'approved') then
    raise exception 'booking_not_editable' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_project_name, ''))) = 0 then
    raise exception 'project_name_required' using errcode = 'P0001';
  end if;

  if p_estimated_duration_minutes is null
     or p_estimated_duration_minutes < 30
     or p_estimated_duration_minutes > 1440
     or p_estimated_duration_minutes % 30 <> 0 then
    raise exception 'invalid_duration' using errcode = 'P0001';
  end if;

  -- A start in the past is only tolerated when it is left untouched, so an
  -- approved booking whose start already passed can still have its name,
  -- printer or material edited.
  if p_starts_at is null
     or (p_starts_at < now() and p_starts_at <> v_booking.starts_at) then
    raise exception 'invalid_start_time' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_estimated_duration_minutes);
  v_old_lock := hashtext(v_booking.printer_id::text);
  v_new_lock := hashtext(p_printer_id::text);

  perform pg_advisory_xact_lock(least(v_old_lock, v_new_lock));
  if v_old_lock <> v_new_lock then
    perform pg_advisory_xact_lock(greatest(v_old_lock, v_new_lock));
  end if;

  select * into v_printer
  from public.printers
  where id = p_printer_id;

  if not found or v_printer.status <> 'active' then
    raise exception 'printer_unavailable' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.printer_materials pm
    join public.materials m on m.id = pm.material_id
    where pm.printer_id = p_printer_id
      and pm.material_id = p_material_id
      and m.is_active
  ) then
    raise exception 'incompatible_material' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.printer_bookings b
    where b.id <> p_booking_id
      and b.printer_id = p_printer_id
      and b.status in ('pending', 'approved', 'in_progress')
      and p_starts_at < b.ends_at
      and v_ends_at > b.starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks mb
    where mb.printer_id = p_printer_id
      and p_starts_at < mb.ends_at
      and v_ends_at > mb.starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  update public.printer_bookings
  set printer_id = p_printer_id,
      material_id = p_material_id,
      project_name = btrim(p_project_name),
      starts_at = p_starts_at,
      ends_at = v_ends_at,
      estimated_duration_minutes = p_estimated_duration_minutes,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.update_printer_booking(
  p_booking_id uuid,
  p_printer_id uuid,
  p_material_id uuid,
  p_project_name text,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
) returns public.printer_bookings
language sql
security definer
set search_path = public, private
as $$
  select private.update_printer_booking_internal(
    p_booking_id,
    p_printer_id,
    p_material_id,
    p_project_name,
    p_starts_at,
    p_estimated_duration_minutes,
    p_notes
  );
$$;

create or replace function public.create_maintenance_block(
  p_printer_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_notes text default null
) returns public.maintenance_blocks
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_block public.maintenance_blocks;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at then
    raise exception 'invalid_interval' using errcode = 'P0001';
  end if;

  if p_starts_at < now() then
    raise exception 'invalid_start_time' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_printer_id::text));

  if not exists (select 1 from public.printers where id = p_printer_id) then
    raise exception 'printer_not_found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.printer_bookings
    where printer_id = p_printer_id
      and status in ('pending', 'approved', 'in_progress')
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks
    where printer_id = p_printer_id
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  insert into public.maintenance_blocks (
    printer_id, created_by, starts_at, ends_at, reason, notes
  ) values (
    p_printer_id, auth.uid(), p_starts_at, p_ends_at, btrim(p_reason),
    nullif(btrim(coalesce(p_notes, '')), '')
  ) returning * into v_block;

  return v_block;
end;
$$;

revoke all on function private.reject_printer_booking_internal(uuid, text) from public;
revoke all on function public.reject_printer_booking(uuid, text) from public;
revoke all on function public.set_printer_booking_status(uuid, public.booking_status) from public;
revoke all on function public.update_printer_booking(uuid, uuid, uuid, text, timestamptz, integer, text) from public;
revoke all on function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text) from public;

grant execute on function public.reject_printer_booking(uuid, text) to authenticated;
grant execute on function public.set_printer_booking_status(uuid, public.booking_status) to authenticated;
grant execute on function public.update_printer_booking(uuid, uuid, uuid, text, timestamptz, integer, text) to authenticated;
grant execute on function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text) to authenticated;

comment on function public.reject_printer_booking(uuid, text)
  is 'Rejects a pending booking with an optional reason, keeping it distinct from cancellations.';
comment on function public.set_printer_booking_status(uuid, public.booking_status)
  is 'Moves a booking through the coordinator-controlled operational lifecycle with temporal validation.';
comment on function public.update_printer_booking(uuid, uuid, uuid, text, timestamptz, integer, text)
  is 'Edits an active booking; a past start time is only allowed when unchanged.';
comment on function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text)
  is 'Creates a forward-looking maintenance block that cannot overlap active bookings or other blocks.';
