-- Equipment: the lab has more than printers, and every piece of equipment can be booked.
-- Tables, enum, constraints and policies are renamed in place so existing data and foreign keys are
-- kept. The booking functions are recreated because their bodies refer to the old names.

-- 1. Equipment types. `uses_material` says whether a booking of this type needs a material.
create table public.equipment_types (
    id uuid default gen_random_uuid() not null,
    name text not null,
    uses_material boolean default false not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint equipment_types_pkey primary key (id),
    constraint equipment_types_name_check check (length(btrim(name)) > 0)
);
alter table public.equipment_types owner to postgres;
create unique index equipment_types_name_key on public.equipment_types (lower(btrim(name)));
create trigger equipment_types_touch_updated_at before update on public.equipment_types
    for each row execute function public.touch_updated_at();

insert into public.equipment_types (name, uses_material) values
    ('Impressora 3D', true),
    ('Scanner 3D', false),
    ('Cortadora a laser', false),
    ('Bancada e ferramentas', false),
    ('Computador', false);

alter table public.equipment_types enable row level security;
create policy "active users read equipment types" on public.equipment_types
    for select to authenticated using (private.has_active_profile());
create policy "coordinators manage equipment types" on public.equipment_types
    to authenticated using (private.is_coordinator()) with check (private.is_coordinator());
grant select, insert, update on table public.equipment_types to authenticated;
grant all on table public.equipment_types to service_role;

-- 2. Rename tables, enum and columns.
alter type public.printer_status rename to equipment_status;
alter table public.printers rename to equipment;
alter table public.printer_materials rename to equipment_materials;
alter table public.printer_bookings rename to equipment_bookings;
alter table public.equipment_materials rename column printer_id to equipment_id;
alter table public.equipment_bookings rename column printer_id to equipment_id;
alter table public.maintenance_blocks rename column printer_id to equipment_id;

-- 3. Type and asset tag on equipment; existing rows are printers.
alter table public.equipment add column type_id uuid;
update public.equipment set type_id = (select id from public.equipment_types where name = 'Impressora 3D');
alter table public.equipment alter column type_id set not null;
alter table public.equipment
    add constraint equipment_type_id_fkey foreign key (type_id) references public.equipment_types (id) on delete restrict;
alter table public.equipment add column asset_tag text;
create index equipment_type_id_idx on public.equipment (type_id);

-- Only equipment whose type uses material needs one in a booking.
alter table public.equipment_bookings alter column material_id drop not null;

-- 4. Rename constraints (this also renames their indexes), plain indexes, triggers and policies.
alter table public.equipment rename constraint printers_name_check to equipment_name_check;
alter table public.equipment rename constraint printers_name_key to equipment_name_key;
alter table public.equipment rename constraint printers_pkey to equipment_pkey;

alter table public.equipment_materials rename constraint printer_materials_material_id_fkey to equipment_materials_material_id_fkey;
alter table public.equipment_materials rename constraint printer_materials_pkey to equipment_materials_pkey;
alter table public.equipment_materials rename constraint printer_materials_printer_id_fkey to equipment_materials_equipment_id_fkey;

alter table public.maintenance_blocks rename constraint maintenance_blocks_printer_id_fkey to maintenance_blocks_equipment_id_fkey;
alter index public.maintenance_blocks_printer_interval_idx rename to maintenance_blocks_equipment_interval_idx;

alter table public.equipment_bookings rename constraint printer_bookings_approved_by_fkey to equipment_bookings_approved_by_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_cancelled_by_fkey to equipment_bookings_cancelled_by_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_check to equipment_bookings_check;
alter table public.equipment_bookings rename constraint printer_bookings_estimated_duration_minutes_check to equipment_bookings_estimated_duration_minutes_check;
alter table public.equipment_bookings rename constraint printer_bookings_material_id_fkey to equipment_bookings_material_id_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_no_active_overlap to equipment_bookings_no_active_overlap;
alter table public.equipment_bookings rename constraint printer_bookings_pkey to equipment_bookings_pkey;
alter table public.equipment_bookings rename constraint printer_bookings_printer_id_fkey to equipment_bookings_equipment_id_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_profile_id_fkey to equipment_bookings_profile_id_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_project_id_fkey to equipment_bookings_project_id_fkey;
alter table public.equipment_bookings rename constraint printer_bookings_project_name_check to equipment_bookings_project_name_check;
alter table public.equipment_bookings rename constraint printer_bookings_rejected_by_fkey to equipment_bookings_rejected_by_fkey;
alter index public.printer_bookings_approved_by_idx rename to equipment_bookings_approved_by_idx;
alter index public.printer_bookings_printer_interval_idx rename to equipment_bookings_equipment_interval_idx;
alter index public.printer_bookings_profile_starts_idx rename to equipment_bookings_profile_starts_idx;
alter index public.printer_bookings_project_id_idx rename to equipment_bookings_project_id_idx;
alter index public.printer_bookings_rejected_by_idx rename to equipment_bookings_rejected_by_idx;

alter trigger printers_touch_updated_at on public.equipment rename to equipment_touch_updated_at;
alter trigger printer_bookings_touch_updated_at on public.equipment_bookings rename to equipment_bookings_touch_updated_at;

alter policy "active users read printers" on public.equipment rename to "active users read equipment";
alter policy "coordinators manage printers" on public.equipment rename to "coordinators manage equipment";
alter policy "active users read printer materials" on public.equipment_materials rename to "active users read equipment materials";
alter policy "coordinators manage printer materials" on public.equipment_materials rename to "coordinators manage equipment materials";

-- 5. Drop the functions that refer to the old names.
drop function public.cancel_printer_booking(uuid);
drop function public.reject_printer_booking(uuid, text);
drop function public.set_printer_booking_status(uuid, public.booking_status);
drop function public.create_printer_booking(uuid, uuid, uuid, timestamptz, integer, text);
drop function public.update_printer_booking(uuid, uuid, uuid, uuid, timestamptz, integer, text);
drop function public.replace_printer_materials(uuid, uuid[]);
drop function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text);
drop function private.cancel_printer_booking_internal(uuid);
drop function private.reject_printer_booking_internal(uuid, text);
drop function private.create_printer_booking_internal(uuid, uuid, uuid, timestamptz, integer, text);
drop function private.update_printer_booking_internal(uuid, uuid, uuid, uuid, timestamptz, integer, text);

-- 6. Helper: does this equipment need a material in a booking?
create function private.equipment_uses_material(p_equipment_id uuid) returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select coalesce((
    select t.uses_material
    from public.equipment e
    join public.equipment_types t on t.id = e.type_id
    where e.id = p_equipment_id
  ), false);
$$;
alter function private.equipment_uses_material(uuid) owner to postgres;
revoke all on function private.equipment_uses_material(uuid) from public;

-- 7. Booking functions. The material is optional and goes last: it only applies to equipment
-- whose type uses material (for any other equipment it is ignored and stored as null).
create function private.create_booking_internal(
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null
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
alter function private.create_booking_internal(uuid, uuid, timestamptz, integer, uuid, text) owner to postgres;
revoke all on function private.create_booking_internal(uuid, uuid, timestamptz, integer, uuid, text) from public;

create function public.create_booking(
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null
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
    p_notes
  );
$$;
alter function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text) owner to postgres;
revoke all on function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text) from public;
grant all on function public.create_booking(uuid, uuid, timestamptz, integer, uuid, text) to authenticated;

create function private.update_booking_internal(
  p_booking_id uuid,
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null
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
alter function private.update_booking_internal(uuid, uuid, uuid, timestamptz, integer, uuid, text) owner to postgres;
revoke all on function private.update_booking_internal(uuid, uuid, uuid, timestamptz, integer, uuid, text) from public;

create function public.update_booking(
  p_booking_id uuid,
  p_equipment_id uuid,
  p_project_id uuid,
  p_starts_at timestamptz,
  p_estimated_duration_minutes integer,
  p_material_id uuid default null,
  p_notes text default null
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
    p_notes
  );
$$;
alter function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text) owner to postgres;
revoke all on function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text) from public;
grant execute on function public.update_booking(uuid, uuid, uuid, timestamptz, integer, uuid, text) to authenticated;

create function private.cancel_booking_internal(p_booking_id uuid) returns public.equipment_bookings
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_booking public.equipment_bookings;
begin
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
    raise exception 'booking_not_cancellable' using errcode = 'P0001';
  end if;

  update public.equipment_bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
alter function private.cancel_booking_internal(uuid) owner to postgres;
revoke all on function private.cancel_booking_internal(uuid) from public;

create function public.cancel_booking(p_booking_id uuid) returns public.equipment_bookings
language sql
security definer
set search_path = 'public', 'private'
as $$
  select private.cancel_booking_internal(p_booking_id);
$$;
alter function public.cancel_booking(uuid) owner to postgres;
revoke all on function public.cancel_booking(uuid) from public;
grant all on function public.cancel_booking(uuid) to authenticated;

create function private.reject_booking_internal(p_booking_id uuid, p_reason text default null)
returns public.equipment_bookings
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_booking public.equipment_bookings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.equipment_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.status <> 'pending' then
    raise exception 'invalid_booking_status_transition' using errcode = 'P0001';
  end if;

  update public.equipment_bookings
  set status = 'rejected',
      rejected_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      rejected_at = now(),
      rejected_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;
alter function private.reject_booking_internal(uuid, text) owner to postgres;
revoke all on function private.reject_booking_internal(uuid, text) from public;

create function public.reject_booking(p_booking_id uuid, p_reason text default null)
returns public.equipment_bookings
language sql
security definer
set search_path = 'public', 'private'
as $$
  select private.reject_booking_internal(p_booking_id, p_reason);
$$;
alter function public.reject_booking(uuid, text) owner to postgres;
revoke all on function public.reject_booking(uuid, text) from public;
grant all on function public.reject_booking(uuid, text) to authenticated;

create function public.set_booking_status(p_booking_id uuid, p_status public.booking_status)
returns public.equipment_bookings
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_booking public.equipment_bookings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  select * into v_booking
  from public.equipment_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_status = v_booking.status then
    return v_booking;
  end if;

  if p_status = 'cancelled' then
    return private.cancel_booking_internal(p_booking_id);
  end if;

  if p_status = 'rejected' then
    return private.reject_booking_internal(p_booking_id, null);
  end if;

  if not (
    (v_booking.status = 'pending' and p_status = 'approved')
    or (v_booking.status = 'approved' and p_status = 'in_progress')
    or (v_booking.status = 'in_progress' and p_status in ('completed', 'failed'))
  ) then
    raise exception 'invalid_booking_status_transition' using errcode = 'P0001';
  end if;

  -- Operational states only make sense close to (or after) the booking window.
  -- A small grace window keeps the coordinator from finishing work that only
  -- starts days from now while allowing same-day operational flexibility.
  if p_status in ('in_progress', 'completed', 'failed')
     and now() < v_booking.starts_at - interval '1 hour' then
    raise exception 'booking_not_started' using errcode = 'P0001';
  end if;

  update public.equipment_bookings
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
alter function public.set_booking_status(uuid, public.booking_status) owner to postgres;
revoke all on function public.set_booking_status(uuid, public.booking_status) from public;
grant all on function public.set_booking_status(uuid, public.booking_status) to authenticated;

-- 8. Maintenance blocks and material compatibility.
create function public.create_maintenance_block(
  p_equipment_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_notes text default null
) returns public.maintenance_blocks
language plpgsql
security definer
set search_path = 'public', 'private'
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

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  if not exists (select 1 from public.equipment where id = p_equipment_id) then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.equipment_bookings
    where equipment_id = p_equipment_id
      and status in ('pending', 'approved', 'in_progress')
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks
    where equipment_id = p_equipment_id
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  insert into public.maintenance_blocks (
    equipment_id, created_by, starts_at, ends_at, reason, notes
  ) values (
    p_equipment_id, auth.uid(), p_starts_at, p_ends_at, btrim(p_reason),
    nullif(btrim(coalesce(p_notes, '')), '')
  ) returning * into v_block;

  return v_block;
end;
$$;
alter function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text) owner to postgres;
revoke all on function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text) from public;
grant all on function public.create_maintenance_block(uuid, timestamptz, timestamptz, text, text) to authenticated;

create function public.replace_equipment_materials(p_equipment_id uuid, p_material_ids uuid[])
returns setof public.equipment_materials
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_material_ids uuid[] := coalesce(p_material_ids, '{}'::uuid[]);
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.equipment where id = p_equipment_id) then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  if cardinality(v_material_ids) <> (
    select count(distinct material_id)
    from unnest(v_material_ids) as material_id
  ) then
    raise exception 'duplicate_materials' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from unnest(v_material_ids) as requested(material_id)
    left join public.materials m on m.id = requested.material_id and m.is_active
    where m.id is null
  ) then
    raise exception 'invalid_material' using errcode = 'P0001';
  end if;

  delete from public.equipment_materials where equipment_id = p_equipment_id;

  insert into public.equipment_materials (equipment_id, material_id)
  select p_equipment_id, material_id from unnest(v_material_ids) as material_id;

  return query
  select * from public.equipment_materials where equipment_id = p_equipment_id;
end;
$$;
alter function public.replace_equipment_materials(uuid, uuid[]) owner to postgres;
revoke all on function public.replace_equipment_materials(uuid, uuid[]) from public;
grant all on function public.replace_equipment_materials(uuid, uuid[]) to authenticated;
