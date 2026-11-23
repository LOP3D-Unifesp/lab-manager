-- Inventory: materials get a category and unit; each physical spool (color, manufacturer, weight)
-- is tracked in material_spools and belongs to a project or to the general lab stock. A booking can
-- name the spool it uses, and the amount used is taken off the spool when the print is finished.

create type public.material_category as enum ('filament', 'resin', 'powder', 'other');
alter type public.material_category owner to postgres;

create type public.spool_status as enum ('sealed', 'in_use', 'empty', 'discarded');
alter type public.spool_status owner to postgres;

alter table public.materials add column category public.material_category default 'filament' not null;
alter table public.materials add column unit text default 'g' not null;
alter table public.materials add constraint materials_unit_check check (unit in ('g', 'ml'));

create table public.material_spools (
    id uuid default gen_random_uuid() not null,
    material_id uuid not null,
    color_name text not null,
    color_hex text,
    manufacturer text,
    diameter_mm numeric(4, 2),
    lot_number text,
    initial_amount numeric(10, 2) not null,
    current_amount numeric(10, 2) not null,
    status public.spool_status default 'sealed' not null,
    -- null project = general lab stock
    project_id uuid,
    storage_location text,
    opened_on date,
    last_dried_on date,
    notes text,
    created_by uuid default auth.uid(),
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint material_spools_pkey primary key (id),
    constraint material_spools_material_id_fkey foreign key (material_id) references public.materials (id) on delete restrict,
    constraint material_spools_project_id_fkey foreign key (project_id) references public.projects (id) on delete restrict,
    constraint material_spools_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
    constraint material_spools_color_name_check check (length(btrim(color_name)) > 0),
    constraint material_spools_color_hex_check check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
    constraint material_spools_diameter_check check (diameter_mm is null or diameter_mm > 0),
    constraint material_spools_initial_amount_check check (initial_amount > 0),
    constraint material_spools_current_amount_check check (current_amount >= 0 and current_amount <= initial_amount)
);
alter table public.material_spools owner to postgres;
create index material_spools_material_id_idx on public.material_spools (material_id);
create index material_spools_project_id_idx on public.material_spools (project_id);
create trigger material_spools_touch_updated_at before update on public.material_spools
    for each row execute function public.touch_updated_at();

-- Keeps the status in line with the weight: an empty spool is "empty", and a sealed spool that loses
-- weight is "in use".
create function private.sync_spool_status() returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
  if new.current_amount = 0 and new.status in ('sealed', 'in_use') then
    new.status := 'empty';
  elsif tg_op = 'UPDATE'
        and new.current_amount < old.current_amount
        and new.status = 'sealed' then
    new.status := 'in_use';
  end if;
  return new;
end;
$$;
alter function private.sync_spool_status() owner to postgres;
create trigger material_spools_sync_status before insert or update on public.material_spools
    for each row execute function private.sync_spool_status();

alter table public.material_spools enable row level security;
create policy "active users read spools" on public.material_spools
    for select to authenticated using (private.has_active_profile());
create policy "coordinators manage spools" on public.material_spools
    to authenticated using (private.is_coordinator()) with check (private.is_coordinator());
grant select, insert, update on table public.material_spools to authenticated;
grant all on table public.material_spools to service_role;

-- Materials stay coordinator-managed, now also editable (rename, archive) from the inventory page.
grant update on table public.materials to authenticated;

alter table public.equipment_bookings add column spool_id uuid;
alter table public.equipment_bookings add column consumed_amount numeric(10, 2);
alter table public.equipment_bookings
    add constraint equipment_bookings_spool_id_fkey foreign key (spool_id) references public.material_spools (id) on delete restrict;
alter table public.equipment_bookings
    add constraint equipment_bookings_consumed_amount_check check (consumed_amount is null or consumed_amount >= 0);
create index equipment_bookings_spool_id_idx on public.equipment_bookings (spool_id);

-- Validates the spool chosen for a booking. It must be of the booking's material and belong to the
-- booking's project or to the general stock. A different spool than the one already on the booking
-- must also be usable (not empty or discarded, with weight left).
create function private.resolve_booking_spool(
  p_spool_id uuid,
  p_material_id uuid,
  p_project_id uuid,
  p_current_spool_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_spool public.material_spools;
begin
  if p_spool_id is null then
    return null;
  end if;

  select * into v_spool from public.material_spools where id = p_spool_id;

  if not found
     or v_spool.material_id is distinct from p_material_id
     or (v_spool.project_id is not null and v_spool.project_id is distinct from p_project_id) then
    raise exception 'spool_not_available' using errcode = 'P0001';
  end if;

  if p_spool_id is distinct from p_current_spool_id
     and (v_spool.status not in ('sealed', 'in_use') or v_spool.current_amount <= 0) then
    raise exception 'spool_not_available' using errcode = 'P0001';
  end if;

  return p_spool_id;
end;
$$;
alter function private.resolve_booking_spool(uuid, uuid, uuid, uuid) owner to postgres;
revoke all on function private.resolve_booking_spool(uuid, uuid, uuid, uuid) from public;

-- Booking functions gain the optional spool (last parameter). Only equipment whose type uses material
-- can name one; for the rest it is ignored.
drop function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text);
drop function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text);
drop function private.create_booking_internal(uuid, uuid, timestamptz, integer, uuid, text);
drop function private.update_booking_internal(uuid, uuid, uuid, timestamptz, integer, uuid, text);

create function private.create_booking_internal(
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null,
  p_spool_id uuid default null
) returns public.equipment_bookings
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_profile public.profiles;
  v_equipment public.equipment;
  v_project public.projects;
  v_material_id uuid;
  v_spool_id uuid;
  v_ends_at timestamptz;
  v_booking public.equipment_bookings;
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

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  select * into v_equipment
  from public.equipment
  where id = p_equipment_id;

  if not found or v_equipment.status <> 'active' then
    raise exception 'equipment_unavailable' using errcode = 'P0001';
  end if;

  if private.equipment_uses_material(p_equipment_id) then
    if p_material_id is null then
      raise exception 'material_required' using errcode = 'P0001';
    end if;

    if not exists (
      select 1
      from public.equipment_materials em
      join public.materials m on m.id = em.material_id
      where em.equipment_id = p_equipment_id
        and em.material_id = p_material_id
        and m.is_active
    ) then
      raise exception 'incompatible_material' using errcode = 'P0001';
    end if;

    v_material_id := p_material_id;
    v_spool_id := private.resolve_booking_spool(p_spool_id, p_material_id, v_project.id);
  end if;

  if exists (
    select 1
    from public.equipment_bookings b
    where b.equipment_id = p_equipment_id
      and b.status in ('pending', 'approved', 'in_progress')
      and p_starts_at < b.ends_at
      and v_ends_at > b.starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks mb
    where mb.equipment_id = p_equipment_id
      and p_starts_at < mb.ends_at
      and v_ends_at > mb.starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  insert into public.equipment_bookings (
    equipment_id,
    profile_id,
    material_id,
    spool_id,
    project_id,
    project_name,
    starts_at,
    ends_at,
    estimated_duration_minutes,
    status,
    notes
  )
  values (
    p_equipment_id,
    v_profile.id,
    v_material_id,
    v_spool_id,
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
alter function private.create_booking_internal(uuid, uuid, timestamptz, integer, uuid, text, uuid) owner to postgres;
revoke all on function private.create_booking_internal(uuid, uuid, timestamptz, integer, uuid, text, uuid) from public;

create function public.create_booking(
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null,
  p_spool_id uuid default null
) returns public.equipment_bookings
language sql
security definer
set search_path = 'public', 'private'
as $$
  select private.create_booking_internal(
    p_equipment_id,
    p_project_id,
    p_starts_at,
    p_estimated_duration_minutes,
    p_material_id,
    p_notes,
    p_spool_id
  );
$$;
alter function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text, uuid) owner to postgres;
revoke all on function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text, uuid) from public;
grant all on function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text, uuid) to authenticated;

create function private.update_booking_internal(
  p_booking_id uuid,
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null,
  p_spool_id uuid default null
) returns public.equipment_bookings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_booking public.equipment_bookings;
  v_equipment public.equipment;
  v_project public.projects;
  v_material_id uuid;
  v_spool_id uuid;
  v_ends_at timestamptz;
  v_old_lock integer;
  v_new_lock integer;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.equipment_bookings
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
  -- equipment or material edited.
  if p_starts_at is null
     or (p_starts_at < now() and p_starts_at <> v_booking.starts_at) then
    raise exception 'invalid_start_time' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_estimated_duration_minutes);
  v_old_lock := hashtext(v_booking.equipment_id::text);
  v_new_lock := hashtext(p_equipment_id::text);

  perform pg_advisory_xact_lock(least(v_old_lock, v_new_lock));
  if v_old_lock <> v_new_lock then
    perform pg_advisory_xact_lock(greatest(v_old_lock, v_new_lock));
  end if;

  select * into v_equipment
  from public.equipment
  where id = p_equipment_id;

  if not found or v_equipment.status <> 'active' then
    raise exception 'equipment_unavailable' using errcode = 'P0001';
  end if;

  if private.equipment_uses_material(p_equipment_id) then
    if p_material_id is null then
      raise exception 'material_required' using errcode = 'P0001';
    end if;

    if not exists (
      select 1
      from public.equipment_materials em
      join public.materials m on m.id = em.material_id
      where em.equipment_id = p_equipment_id
        and em.material_id = p_material_id
        and m.is_active
    ) then
      raise exception 'incompatible_material' using errcode = 'P0001';
    end if;

    v_material_id := p_material_id;
    v_spool_id := private.resolve_booking_spool(p_spool_id, p_material_id, v_project.id, v_booking.spool_id);
  end if;

  if exists (
    select 1
    from public.equipment_bookings b
    where b.id <> p_booking_id
      and b.equipment_id = p_equipment_id
      and b.status in ('pending', 'approved', 'in_progress')
      and p_starts_at < b.ends_at
      and v_ends_at > b.starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks mb
    where mb.equipment_id = p_equipment_id
      and p_starts_at < mb.ends_at
      and v_ends_at > mb.starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  update public.equipment_bookings
  set equipment_id = p_equipment_id,
      material_id = v_material_id,
      spool_id = v_spool_id,
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
alter function private.update_booking_internal(uuid, uuid, uuid, timestamptz, integer, uuid, text, uuid) owner to postgres;
revoke all on function private.update_booking_internal(uuid, uuid, uuid, timestamptz, integer, uuid, text, uuid) from public;

create function public.update_booking(
  p_booking_id uuid,
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null,
  p_spool_id uuid default null
) returns public.equipment_bookings
language sql
security definer
set search_path = public, private
as $$
  select private.update_booking_internal(
    p_booking_id,
    p_equipment_id,
    p_project_id,
    p_starts_at,
    p_estimated_duration_minutes,
    p_material_id,
    p_notes,
    p_spool_id
  );
$$;
alter function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text, uuid) owner to postgres;
revoke all on function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text, uuid) from public;
grant execute on function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text, uuid) to authenticated;

-- Records how much of the spool a finished booking used and takes it off the spool. Calling it again
-- corrects the amount: the previous value is given back before the new one is applied. The amount is
-- capped at what the spool has left.
create function public.record_booking_usage(p_booking_id uuid, p_amount numeric)
returns public.equipment_bookings
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_booking public.equipment_bookings;
  v_spool public.material_spools;
  v_available numeric;
  v_applied numeric;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.equipment_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if not private.is_coordinator() and v_booking.profile_id <> auth.uid() then
    raise exception 'booking_forbidden' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('in_progress', 'completed', 'failed') then
    raise exception 'usage_not_allowed' using errcode = 'P0001';
  end if;

  if v_booking.spool_id is null then
    raise exception 'booking_without_spool' using errcode = 'P0001';
  end if;

  if p_amount is null or p_amount < 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  select * into v_spool
  from public.material_spools
  where id = v_booking.spool_id
  for update;

  v_available := least(v_spool.initial_amount, v_spool.current_amount + coalesce(v_booking.consumed_amount, 0));
  v_applied := least(p_amount, v_available);

  update public.material_spools
  set current_amount = v_available - v_applied,
      opened_on = coalesce(opened_on, current_date)
  where id = v_spool.id;

  update public.equipment_bookings
  set consumed_amount = v_applied
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
alter function public.record_booking_usage(uuid, numeric) owner to postgres;
revoke all on function public.record_booking_usage(uuid, numeric) from public;
grant all on function public.record_booking_usage(uuid, numeric) to authenticated;
