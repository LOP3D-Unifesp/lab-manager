alter table public.profiles
  add column requires_booking_approval boolean not null default true;

create or replace function private.create_printer_booking_internal(
  p_printer_id uuid,
  p_material_id uuid,
  p_project_name text,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
) returns public.printer_bookings
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_profile public.profiles;
  v_printer public.printers;
  v_ends_at timestamptz;
  v_booking public.printer_bookings;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and is_active;

  if not found then
    raise exception 'active_profile_required' using errcode = 'P0001';
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
    btrim(p_project_name),
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

comment on column public.profiles.requires_booking_approval
  is 'When true, printer bookings created by this researcher start as pending and require coordinator approval instead of auto-approving. Has no effect on coordinator profiles, which always auto-approve.';
