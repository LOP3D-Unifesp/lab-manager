create extension if not exists "pgcrypto";

create type public.user_role as enum ('coordinator', 'researcher');
create type public.academic_affiliation as enum (
  'ic',
  'extension',
  'intern',
  'tcc',
  'masters',
  'phd',
  'postdoc',
  'visitor',
  'technician',
  'faculty',
  'other'
);
create type public.printer_status as enum (
  'active',
  'maintenance',
  'unavailable',
  'disabled'
);
create type public.booking_status as enum (
  'pending',
  'approved',
  'in_progress',
  'completed',
  'cancelled',
  'failed'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (length(btrim(full_name)) > 0),
  email text not null unique check (position('@' in email) > 1),
  role public.user_role not null default 'researcher',
  academic_affiliation public.academic_affiliation,
  nationality_country_code char(2) check (
    nationality_country_code is null or nationality_country_code ~ '^[A-Z]{2}$'
  ),
  phone text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique (profile_id, weekday, starts_at, ends_at)
);

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  model text,
  location text,
  status public.printer_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.printer_materials (
  printer_id uuid not null references public.printers(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (printer_id, material_id)
);

create table public.printer_bookings (
  id uuid primary key default gen_random_uuid(),
  printer_id uuid not null references public.printers(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  project_name text not null check (length(btrim(project_name)) > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  estimated_duration_minutes integer not null check (
    estimated_duration_minutes between 30 and 1440 and
    estimated_duration_minutes % 30 = 0
  ),
  status public.booking_status not null default 'approved',
  notes text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.maintenance_blocks (
  id uuid primary key default gen_random_uuid(),
  printer_id uuid not null references public.printers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (length(btrim(reason)) > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index profiles_role_idx on public.profiles(role);
create index profiles_is_active_idx on public.profiles(is_active);
create index availability_slots_weekday_idx on public.availability_slots(weekday, starts_at, ends_at);
create index printer_bookings_printer_interval_idx on public.printer_bookings(printer_id, starts_at, ends_at);
create index printer_bookings_profile_starts_idx on public.printer_bookings(profile_id, starts_at);
create index maintenance_blocks_printer_interval_idx on public.maintenance_blocks(printer_id, starts_at, ends_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger skills_touch_updated_at
before update on public.skills
for each row execute function public.touch_updated_at();

create trigger availability_slots_touch_updated_at
before update on public.availability_slots
for each row execute function public.touch_updated_at();

create trigger printers_touch_updated_at
before update on public.printers
for each row execute function public.touch_updated_at();

create trigger materials_touch_updated_at
before update on public.materials
for each row execute function public.touch_updated_at();

create trigger printer_bookings_touch_updated_at
before update on public.printer_bookings
for each row execute function public.touch_updated_at();

create trigger maintenance_blocks_touch_updated_at
before update on public.maintenance_blocks
for each row execute function public.touch_updated_at();

create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role <> new.role and not public.is_coordinator() then
    raise exception 'role_change_forbidden' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_role_self_change
before update on public.profiles
for each row execute function public.prevent_profile_role_self_change();

create or replace function public.is_coordinator()
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

create or replace function public.has_active_profile()
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

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.availability_slots enable row level security;
alter table public.printers enable row level security;
alter table public.materials enable row level security;
alter table public.printer_materials enable row level security;
alter table public.printer_bookings enable row level security;
alter table public.maintenance_blocks enable row level security;

create policy "active users can read active profiles"
on public.profiles for select
to authenticated
using (public.has_active_profile() and is_active);

create policy "users can update own non-role profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and is_active)
with check (id = auth.uid());

create policy "coordinators manage profiles"
on public.profiles for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read skills"
on public.skills for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage skills"
on public.skills for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read profile skills"
on public.profile_skills for select
to authenticated
using (public.has_active_profile());

create policy "users manage own profile skills"
on public.profile_skills for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "active users read availability"
on public.availability_slots for select
to authenticated
using (public.has_active_profile());

create policy "users manage own availability"
on public.availability_slots for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "active users read printers"
on public.printers for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage printers"
on public.printers for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read materials"
on public.materials for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage materials"
on public.materials for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read printer materials"
on public.printer_materials for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage printer materials"
on public.printer_materials for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read bookings"
on public.printer_bookings for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage bookings"
on public.printer_bookings for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create policy "active users read maintenance"
on public.maintenance_blocks for select
to authenticated
using (public.has_active_profile());

create policy "coordinators manage maintenance"
on public.maintenance_blocks for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());

create or replace function public.create_printer_booking(
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

create or replace function public.cancel_printer_booking(p_booking_id uuid)
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

  if not public.is_coordinator() and v_booking.profile_id <> auth.uid() then
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

grant execute on function public.create_printer_booking(
  uuid,
  uuid,
  text,
  timestamptz,
  integer,
  text
) to authenticated;

grant execute on function public.cancel_printer_booking(uuid) to authenticated;
