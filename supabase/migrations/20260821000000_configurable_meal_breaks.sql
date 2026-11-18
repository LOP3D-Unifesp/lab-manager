alter table public.lab_settings
  add column lunch_starts_at time not null default '12:00',
  add column lunch_ends_at time not null default '13:30',
  add column dinner_starts_at time not null default '17:30',
  add column dinner_ends_at time not null default '19:00';

alter table public.lab_settings
  add constraint lab_settings_lunch_interval_check
    check (lunch_starts_at < lunch_ends_at),
  add constraint lab_settings_dinner_interval_check
    check (dinner_starts_at < dinner_ends_at),
  add constraint lab_settings_meal_intervals_do_not_overlap_check
    check (lunch_ends_at <= dinner_starts_at or dinner_ends_at <= lunch_starts_at);

create or replace function public.update_lab_breaks(
  p_lunch_starts_at time,
  p_lunch_ends_at time,
  p_dinner_starts_at time,
  p_dinner_ends_at time
) returns public.lab_settings
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_settings public.lab_settings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('lab_schedule_configuration'));
  if p_lunch_starts_at is null or p_lunch_ends_at is null
     or p_dinner_starts_at is null or p_dinner_ends_at is null
     or p_lunch_starts_at >= p_lunch_ends_at
     or p_dinner_starts_at >= p_dinner_ends_at
     or not (p_lunch_ends_at <= p_dinner_starts_at
             or p_dinner_ends_at <= p_lunch_starts_at) then
    raise exception 'invalid_meal_breaks' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.lab_schedule_periods
    where is_active and (
      (p_lunch_starts_at < ends_at and p_lunch_ends_at > starts_at)
      or (p_dinner_starts_at < ends_at and p_dinner_ends_at > starts_at)
    )
  ) then
    raise exception 'meal_break_overlap' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set lunch_starts_at = p_lunch_starts_at,
      lunch_ends_at = p_lunch_ends_at,
      dinner_starts_at = p_dinner_starts_at,
      dinner_ends_at = p_dinner_ends_at,
      updated_by = auth.uid()
  where id
  returning * into v_settings;
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
  v_settings public.lab_settings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('lab_schedule_configuration'));
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

  select * into v_settings from public.lab_settings where id;
  if p_is_active and (
    (p_starts_at < v_settings.lunch_ends_at and p_ends_at > v_settings.lunch_starts_at)
    or (p_starts_at < v_settings.dinner_ends_at and p_ends_at > v_settings.dinner_starts_at)
  ) then
    raise exception 'schedule_period_break_overlap' using errcode = 'P0001';
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

revoke all on function public.update_lab_breaks(time, time, time, time) from public;
grant execute on function public.update_lab_breaks(time, time, time, time) to authenticated;

comment on function public.update_lab_breaks(time, time, time, time)
  is 'Updates the configurable lunch and dinner separators without overlapping active work periods.';
