-- Every new printer booking belongs to a project. Existing bookings keep their free-text
-- project_name and have a null project_id.
alter table public.printer_bookings
  add column project_id uuid references public.projects (id) on delete restrict;
create index printer_bookings_project_id_idx on public.printer_bookings (project_id);

-- Resolves the project of a booking. A different project than the booking already has must be
-- open and, for researchers, one they belong to; keeping the current project is always allowed so
-- an old booking can still be edited after its project is completed or the person leaves it.
create or replace function private.resolve_booking_project(
  p_project_id uuid,
  p_current_project_id uuid default null
) returns public.projects
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_project public.projects;
begin
  if p_project_id is null then
    raise exception 'project_required' using errcode = 'P0001';
  end if;

  select * into v_project from public.projects where id = p_project_id;

  if not found then
    raise exception 'project_not_available' using errcode = 'P0001';
  end if;

  if p_project_id is distinct from p_current_project_id
     and (
       v_project.status not in ('planning', 'active', 'paused')
       or not (private.is_coordinator() or private.is_project_member(p_project_id))
     ) then
    raise exception 'project_not_available' using errcode = 'P0001';
  end if;

  return v_project;
end;
$$;
alter function private.resolve_booking_project(uuid, uuid) owner to postgres;
revoke all on function private.resolve_booking_project(uuid, uuid) from public;

-- The old signatures take the project as free text; replace them with the project id.
drop function public.create_printer_booking(uuid, uuid, text, timestamptz, integer, text);
drop function private.create_printer_booking_internal(uuid, uuid, text, timestamptz, integer, text);
drop function public.update_printer_booking(uuid, uuid, uuid, text, timestamptz, integer, text);
drop function private.update_printer_booking_internal(uuid, uuid, uuid, text, timestamptz, integer, text);

create function private.create_printer_booking_internal(
  p_printer_id uuid,
  p_material_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
) returns public.printer_bookings
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_profile public.profiles;
  v_printer public.printers;
  v_project public.projects;
  v_ends_at timestamptz;
  v_booking public.printer_bookings;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and is_active;

  if not found then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  v_project := private.resolve_booking_project(p_project_id);

  if p_estimated_duration_minutes is null
     or p_estimated_duration_minutes < 30
     or p_estimated_duration_minutes > 1440
     or p_estimated_duration_minutes % 30 <> 0 then
    raise exception 'invalid_duration' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_starts_at < now() then
    raise exception 'invalid_start_time' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_estimated_duration_minutes);

  perform pg_advisory_xact_lock(hashtext(p_printer_id::text));

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
    where b.printer_id = p_printer_id
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

  insert into public.printer_bookings (
    printer_id,
    profile_id,
    material_id,
    project_id,
    project_name,
    starts_at,
    ends_at,
    estimated_duration_minutes,
    status,
    notes
  )
  values (
    p_printer_id,
    v_profile.id,
    p_material_id,
    v_project.id,
    v_project.name,
    p_starts_at,
    v_ends_at,
    p_estimated_duration_minutes,
    (case
       when v_profile.role = 'researcher' and v_profile.requires_booking_approval then 'pending'
       else 'approved'
     end)::public.booking_status,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_booking;

  return v_booking;
end;
$$;
alter function private.create_printer_booking_internal(uuid, uuid, uuid, timestamptz, integer, text) owner to postgres;
revoke all on function private.create_printer_booking_internal(uuid, uuid, uuid, timestamptz, integer, text) from public;

create function public.create_printer_booking(
  p_printer_id uuid,
  p_material_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
) returns public.printer_bookings
language sql
security definer
set search_path = 'public', 'private'
as $$
  select private.create_printer_booking_internal(
    p_printer_id,
    p_material_id,
    p_project_id,
    p_starts_at,
    p_estimated_duration_minutes,
    p_notes
  );
$$;
alter function public.create_printer_booking(uuid, uuid, uuid, timestamptz, integer, text) owner to postgres;
revoke all on function public.create_printer_booking(uuid, uuid, uuid, timestamptz, integer, text) from public;
grant all on function public.create_printer_booking(uuid, uuid, uuid, timestamptz, integer, text) to authenticated;

create function private.update_printer_booking_internal(
  p_booking_id uuid,
  p_printer_id uuid,
  p_material_id uuid,
  p_project_id uuid,
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
  v_project public.projects;
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

  v_project := private.resolve_booking_project(p_project_id, v_booking.project_id);

  if p_estimated_duration_minutes is null
     or p_estimated_duration_minutes < 30
     or p_estimated_duration_minutes > 1440
     or p_estimated_duration_minutes % 30 <> 0 then
    raise exception 'invalid_duration' using errcode = 'P0001';
  end if;

  -- A start in the past is only tolerated when it is left untouched, so an
  -- approved booking whose start already passed can still have its project,
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
      project_id = v_project.id,
      project_name = v_project.name,
      starts_at = p_starts_at,
      ends_at = v_ends_at,
      estimated_duration_minutes = p_estimated_duration_minutes,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
alter function private.update_printer_booking_internal(uuid, uuid, uuid, uuid, timestamptz, integer, text) owner to postgres;
revoke all on function private.update_printer_booking_internal(uuid, uuid, uuid, uuid, timestamptz, integer, text) from public;

create function public.update_printer_booking(
  p_booking_id uuid,
  p_printer_id uuid,
  p_material_id uuid,
  p_project_id uuid,
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
    p_project_id,
    p_starts_at,
    p_estimated_duration_minutes,
    p_notes
  );
$$;
alter function public.update_printer_booking(uuid, uuid, uuid, uuid, timestamptz, integer, text) owner to postgres;
revoke all on function public.update_printer_booking(uuid, uuid, uuid, uuid, timestamptz, integer, text) from public;
grant execute on function public.update_printer_booking(uuid, uuid, uuid, uuid, timestamptz, integer, text) to authenticated;
