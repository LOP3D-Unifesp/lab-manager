create schema if not exists private;

grant usage on schema private to authenticated;

alter function public.touch_updated_at()
  set search_path = public;

revoke execute on function public.touch_updated_at()
  from public, anon, authenticated;

create or replace function private.is_coordinator()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coordinator'
      and is_active
  );
$$;

create or replace function private.has_active_profile()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;

grant execute on function private.is_coordinator() to authenticated;
grant execute on function private.has_active_profile() to authenticated;

drop policy if exists "active users can read active profiles" on public.profiles;
drop policy if exists "users can update own non-role profile" on public.profiles;
drop policy if exists "coordinators manage profiles" on public.profiles;
drop policy if exists "active users read skills" on public.skills;
drop policy if exists "coordinators manage skills" on public.skills;
drop policy if exists "active users read profile skills" on public.profile_skills;
drop policy if exists "users manage own profile skills" on public.profile_skills;
drop policy if exists "active users read availability" on public.availability_slots;
drop policy if exists "users manage own availability" on public.availability_slots;
drop policy if exists "coordinators manage availability" on public.availability_slots;
drop policy if exists "active users read printers" on public.printers;
drop policy if exists "coordinators manage printers" on public.printers;
drop policy if exists "active users read materials" on public.materials;
drop policy if exists "coordinators manage materials" on public.materials;
drop policy if exists "active users read printer materials" on public.printer_materials;
drop policy if exists "coordinators manage printer materials" on public.printer_materials;
drop policy if exists "active users read bookings" on public.printer_bookings;
drop policy if exists "coordinators manage bookings" on public.printer_bookings;
drop policy if exists "active users read maintenance" on public.maintenance_blocks;
drop policy if exists "coordinators manage maintenance" on public.maintenance_blocks;

create policy "active users can read active profiles"
on public.profiles for select
to authenticated
using (private.has_active_profile() and is_active);

create policy "users can update own non-role profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and is_active)
with check (id = auth.uid());

create policy "coordinators manage profiles"
on public.profiles for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read skills"
on public.skills for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage skills"
on public.skills for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read profile skills"
on public.profile_skills for select
to authenticated
using (private.has_active_profile());

create policy "users manage own profile skills"
on public.profile_skills for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "active users read availability"
on public.availability_slots for select
to authenticated
using (private.has_active_profile());

create policy "users manage own availability"
on public.availability_slots for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "coordinators manage availability"
on public.availability_slots for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read printers"
on public.printers for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage printers"
on public.printers for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read materials"
on public.materials for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage materials"
on public.materials for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read printer materials"
on public.printer_materials for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage printer materials"
on public.printer_materials for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read bookings"
on public.printer_bookings for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage bookings"
on public.printer_bookings for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create policy "active users read maintenance"
on public.maintenance_blocks for select
to authenticated
using (private.has_active_profile());

create policy "coordinators manage maintenance"
on public.maintenance_blocks for all
to authenticated
using (private.is_coordinator())
with check (private.is_coordinator());

create or replace function private.prevent_profile_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role <> new.role and not private.is_coordinator() then
    raise exception 'role_change_forbidden' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_change on public.profiles;

create trigger profiles_prevent_role_self_change
before update on public.profiles
for each row execute function private.prevent_profile_role_self_change();

create or replace function private.create_printer_booking_internal(
  p_printer_id uuid,
  p_material_id uuid,
  p_project_name text,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
)
returns public.printer_bookings
language plpgsql
security definer
set search_path = public
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
    'approved',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function private.cancel_printer_booking_internal(p_booking_id uuid)
returns public.printer_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.printer_bookings;
begin
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
    raise exception 'booking_not_cancellable' using errcode = 'P0001';
  end if;

  update public.printer_bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function private.create_printer_booking_internal(
  uuid,
  uuid,
  text,
  timestamptz,
  integer,
  text
) to authenticated;

grant execute on function private.cancel_printer_booking_internal(uuid) to authenticated;

create or replace function public.create_printer_booking(
  p_printer_id uuid,
  p_material_id uuid,
  p_project_name text,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_notes text default null
)
returns public.printer_bookings
language sql
security invoker
set search_path = public, private
as $$
  select private.create_printer_booking_internal(
    p_printer_id,
    p_material_id,
    p_project_name,
    p_starts_at,
    p_estimated_duration_minutes,
    p_notes
  );
$$;

create or replace function public.cancel_printer_booking(p_booking_id uuid)
returns public.printer_bookings
language sql
security invoker
set search_path = public, private
as $$
  select private.cancel_printer_booking_internal(p_booking_id);
$$;

revoke execute on function public.create_printer_booking(
  uuid,
  uuid,
  text,
  timestamptz,
  integer,
  text
) from public, anon;

revoke execute on function public.cancel_printer_booking(uuid) from public, anon;

grant execute on function public.create_printer_booking(
  uuid,
  uuid,
  text,
  timestamptz,
  integer,
  text
) to authenticated;

grant execute on function public.cancel_printer_booking(uuid) to authenticated;

drop function if exists public.is_coordinator();
drop function if exists public.has_active_profile();
drop function if exists public.prevent_profile_role_self_change();

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
