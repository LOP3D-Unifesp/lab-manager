-- Make laboratory capacity and recurring working hours configurable.

alter table public.lab_settings
  add column workspace_capacity integer not null default 10,
  add column operating_weekdays integer[] not null default array[1, 2, 3, 4, 5];

alter table public.lab_settings
  add constraint lab_settings_workspace_capacity_check
    check (workspace_capacity > 0),
  add constraint lab_settings_operating_weekdays_check
    check (
      cardinality(operating_weekdays) > 0
      and operating_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
    );

create table public.lab_schedule_periods (
  id uuid primary key default gen_random_uuid(),
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_schedule_periods_time_check check (starts_at < ends_at),
  constraint lab_schedule_periods_sort_order_check check (sort_order >= 0),
  constraint lab_schedule_periods_unique_interval unique (starts_at, ends_at)
);

insert into public.lab_schedule_periods (id, starts_at, ends_at, sort_order)
values
  ('00000000-0000-0000-0000-0000000000b1', '08:00', '10:00', 10),
  ('00000000-0000-0000-0000-0000000000b2', '10:00', '12:00', 20),
  ('00000000-0000-0000-0000-0000000000b3', '13:30', '15:30', 30),
  ('00000000-0000-0000-0000-0000000000b4', '15:30', '17:30', 40),
  ('00000000-0000-0000-0000-0000000000b5', '19:00', '21:00', 50),
  ('00000000-0000-0000-0000-0000000000b6', '21:00', '23:00', 60);

alter table public.availability_slots
  add column schedule_period_id uuid;

update public.availability_slots a
set schedule_period_id = p.id
from public.lab_schedule_periods p
where a.starts_at = p.starts_at and a.ends_at = p.ends_at;

alter table public.availability_slots
  alter column schedule_period_id set not null,
  add constraint availability_slots_schedule_period_id_fkey
    foreign key (schedule_period_id) references public.lab_schedule_periods(id) on delete restrict;

create index availability_slots_schedule_period_idx
  on public.availability_slots (schedule_period_id, weekday, work_mode);

create or replace function private.sync_availability_period_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.lab_schedule_periods;
begin
  if new.schedule_period_id is null then
    select id into new.schedule_period_id
    from public.lab_schedule_periods
    where starts_at = new.starts_at and ends_at = new.ends_at;
  end if;
  select * into v_period from public.lab_schedule_periods where id = new.schedule_period_id;
  if not found then
    raise exception 'schedule_period_not_found' using errcode = 'P0001';
  end if;
  new.starts_at := v_period.starts_at;
  new.ends_at := v_period.ends_at;
  return new;
end;
$$;

create trigger availability_slots_sync_period_times
before insert or update of schedule_period_id on public.availability_slots
for each row execute function private.sync_availability_period_times();

create or replace function private.propagate_schedule_period_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at then
    update public.availability_slots
    set starts_at = new.starts_at, ends_at = new.ends_at
    where schedule_period_id = new.id;
  end if;
  return new;
end;
$$;

create trigger lab_schedule_periods_propagate_times
after update of starts_at, ends_at on public.lab_schedule_periods
for each row execute function private.propagate_schedule_period_times();

create trigger lab_schedule_periods_touch_updated_at
before update on public.lab_schedule_periods
for each row execute function public.touch_updated_at();

alter table public.lab_schedule_periods enable row level security;
create policy "active users read laboratory schedule"
  on public.lab_schedule_periods for select to authenticated
  using (private.has_active_profile());

grant select on public.lab_schedule_periods to authenticated;
grant all on public.lab_schedule_periods to service_role;

create or replace function public.update_lab_configuration(
  p_name text,
  p_acronym text,
  p_timezone text,
  p_privacy_contact_email text,
  p_workspace_capacity integer,
  p_operating_weekdays integer[]
) returns public.lab_settings
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_settings public.lab_settings;
  v_max_occupancy integer;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  perform private.validate_lab_identity(p_name, p_acronym, p_timezone, p_privacy_contact_email);

  if p_workspace_capacity is null or p_workspace_capacity <= 0 then
    raise exception 'invalid_workspace_capacity' using errcode = 'P0001';
  end if;

  if p_operating_weekdays is null
     or cardinality(p_operating_weekdays) = 0
     or not (p_operating_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]) then
    raise exception 'invalid_operating_weekdays' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('lab_availability_capacity'));

  select coalesce(max(total), 0) into v_max_occupancy
  from (
    select count(distinct profile_id)::integer as total
    from public.availability_slots a
    join public.lab_schedule_periods p on p.id = a.schedule_period_id and p.is_active
    where a.work_mode = 'onsite'
      and weekday = any(p_operating_weekdays)
    group by weekday, schedule_period_id
  ) occupancy;

  if p_workspace_capacity < v_max_occupancy then
    raise exception 'workspace_capacity_below_occupancy' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set name = btrim(p_name),
      acronym = upper(btrim(p_acronym)),
      timezone = p_timezone,
      privacy_contact_email = lower(btrim(p_privacy_contact_email)),
      workspace_capacity = p_workspace_capacity,
      operating_weekdays = (select array_agg(distinct value order by value) from unnest(p_operating_weekdays) value),
      updated_by = auth.uid()
  where id and setup_completed_at is not null
  returning * into v_settings;

  if not found then
    raise exception 'installation_not_completed' using errcode = 'P0001';
  end if;
  return v_settings;
end;
$$;

create or replace function public.save_lab_schedule_period(
  p_id uuid,
  p_starts_at time,
  p_ends_at time,
  p_sort_order integer,
  p_is_active boolean
) returns public.lab_schedule_periods
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_period public.lab_schedule_periods;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;
  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at
     or p_sort_order is null or p_sort_order < 0 then
    raise exception 'invalid_schedule_period' using errcode = 'P0001';
  end if;
  if p_is_active and exists (
    select 1 from public.lab_schedule_periods
    where id <> coalesce(p_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and is_active and p_starts_at < ends_at and p_ends_at > starts_at
  ) then
    raise exception 'schedule_period_overlap' using errcode = 'P0001';
  end if;
  if p_id is not null and not p_is_active and not exists (
    select 1 from public.lab_schedule_periods where id <> p_id and is_active
  ) then
    raise exception 'active_schedule_period_required' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.lab_schedule_periods
      (starts_at, ends_at, sort_order, is_active, created_by, updated_by)
    values (p_starts_at, p_ends_at, p_sort_order, p_is_active, auth.uid(), auth.uid())
    returning * into v_period;
  else
    update public.lab_schedule_periods
    set starts_at = p_starts_at, ends_at = p_ends_at,
        sort_order = p_sort_order, is_active = p_is_active, updated_by = auth.uid()
    where id = p_id returning * into v_period;
    if not found then raise exception 'schedule_period_not_found' using errcode = 'P0001'; end if;
  end if;
  return v_period;
end;
$$;

create or replace function public.replace_profile_availability(
  p_profile_id uuid,
  p_slots jsonb
) returns setof public.availability_slots
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_capacity integer;
  v_weekdays integer[];
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_profile_id <> auth.uid() and not private.is_coordinator() then
    raise exception 'availability_forbidden' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_slots, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_slots' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('lab_availability_capacity'));
  select workspace_capacity, operating_weekdays into v_capacity, v_weekdays
  from public.lab_settings where id;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, schedule_period_id uuid, work_mode text)
    left join public.lab_schedule_periods p on p.id = slot.schedule_period_id
    where slot.weekday is null or not (slot.weekday = any(v_weekdays))
      or slot.schedule_period_id is null or p.id is null or not p.is_active
      or slot.work_mode not in ('onsite', 'remote', 'aula')
  ) then raise exception 'invalid_slots' using errcode = 'P0001'; end if;

  if (select count(*) from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, schedule_period_id uuid, work_mode text)) <>
     (select count(*) from (select distinct weekday, schedule_period_id
      from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, schedule_period_id uuid, work_mode text)) s)
  then raise exception 'duplicate_slots' using errcode = 'P0001'; end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, schedule_period_id uuid, work_mode text)
    where slot.work_mode = 'onsite' and (
      select count(distinct a.profile_id)
      from public.availability_slots a
      where a.profile_id <> p_profile_id and a.work_mode = 'onsite'
        and a.weekday = slot.weekday and a.schedule_period_id = slot.schedule_period_id
    ) >= v_capacity
  ) then raise exception 'workspace_capacity_reached' using errcode = 'P0001'; end if;

  delete from public.availability_slots a
  using public.lab_schedule_periods p
  where a.profile_id = p_profile_id and a.schedule_period_id = p.id
    and p.is_active and a.weekday = any(v_weekdays);
  insert into public.availability_slots
    (profile_id, weekday, schedule_period_id, starts_at, ends_at, work_mode)
  select p_profile_id, slot.weekday, slot.schedule_period_id, p.starts_at, p.ends_at, slot.work_mode
  from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
    as slot(weekday integer, schedule_period_id uuid, work_mode text)
  join public.lab_schedule_periods p on p.id = slot.schedule_period_id;

  return query select * from public.availability_slots
    where profile_id = p_profile_id order by weekday, starts_at;
end;
$$;

revoke insert, update, delete on public.availability_slots from authenticated;
revoke all on function public.update_lab_configuration(text, text, text, text, integer, integer[]) from public;
revoke all on function public.save_lab_schedule_period(uuid, time, time, integer, boolean) from public;
grant execute on function public.update_lab_configuration(text, text, text, text, integer, integer[]) to authenticated;
grant execute on function public.save_lab_schedule_period(uuid, time, time, integer, boolean) to authenticated;

comment on table public.lab_schedule_periods is 'Recurring laboratory working periods shared by all operating days.';
