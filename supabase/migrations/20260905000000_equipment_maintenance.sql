-- Maintenance as a state of the equipment, not a dated block: nobody knows when a repair will end, so
-- the equipment goes "in maintenance" now and stays that way until someone releases it. Every episode
-- is kept (when it started, when it ended, why and by whom) so durations can be analysed later.
-- The existing status 'maintenance' already keeps new bookings out (booking functions only accept
-- active equipment); these functions keep that status and the episode history in step.

create table public.equipment_maintenance (
    id uuid default gen_random_uuid() not null,
    equipment_id uuid not null,
    reason text not null,
    notes text,
    -- Optional estimate, shown as information only; nothing is enforced on it.
    expected_return_on date,
    started_at timestamp with time zone default now() not null,
    started_by uuid default auth.uid(),
    ended_at timestamp with time zone,
    ended_by uuid,
    resolution_notes text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint equipment_maintenance_pkey primary key (id),
    constraint equipment_maintenance_equipment_id_fkey foreign key (equipment_id) references public.equipment (id) on delete restrict,
    constraint equipment_maintenance_started_by_fkey foreign key (started_by) references public.profiles (id) on delete set null,
    constraint equipment_maintenance_ended_by_fkey foreign key (ended_by) references public.profiles (id) on delete set null,
    constraint equipment_maintenance_reason_check check (length(btrim(reason)) > 0),
    constraint equipment_maintenance_dates_check check (ended_at is null or ended_at >= started_at)
);
alter table public.equipment_maintenance owner to postgres;
-- At most one open episode per equipment.
create unique index equipment_maintenance_one_open_idx on public.equipment_maintenance (equipment_id) where ended_at is null;
create index equipment_maintenance_equipment_started_idx on public.equipment_maintenance (equipment_id, started_at desc);
create trigger equipment_maintenance_touch_updated_at before update on public.equipment_maintenance
    for each row execute function public.touch_updated_at();

alter table public.equipment_maintenance enable row level security;
create policy "active users read equipment maintenance" on public.equipment_maintenance
    for select to authenticated using (private.has_active_profile());
-- Writes only through the functions below.
grant select on table public.equipment_maintenance to authenticated;
grant all on table public.equipment_maintenance to service_role;

-- Puts the equipment in maintenance (coordinator only). With p_cancel_bookings, the upcoming pending
-- and approved bookings are cancelled in the same step; a booking already in progress is left alone.
create function public.start_equipment_maintenance(
  p_equipment_id uuid,
  p_reason text,
  p_notes text default null,
  p_expected_return_on date default null,
  p_cancel_bookings boolean default false
) returns public.equipment_maintenance
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
  v_episode public.equipment_maintenance;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  select * into v_equipment from public.equipment where id = p_equipment_id for update;

  if not found then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  if v_equipment.status = 'maintenance'
     or exists (select 1 from public.equipment_maintenance where equipment_id = p_equipment_id and ended_at is null) then
    raise exception 'maintenance_already_open' using errcode = 'P0001';
  end if;

  insert into public.equipment_maintenance (equipment_id, reason, notes, expected_return_on)
  values (
    p_equipment_id,
    btrim(p_reason),
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_expected_return_on
  )
  returning * into v_episode;

  update public.equipment set status = 'maintenance' where id = p_equipment_id;

  if coalesce(p_cancel_bookings, false) then
    update public.equipment_bookings
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by = auth.uid()
    where equipment_id = p_equipment_id
      and status in ('pending', 'approved')
      and starts_at > now();
  end if;

  return v_episode;
end;
$$;
alter function public.start_equipment_maintenance(uuid, text, text, date, boolean) owner to postgres;
revoke all on function public.start_equipment_maintenance(uuid, text, text, date, boolean) from public;
grant all on function public.start_equipment_maintenance(uuid, text, text, date, boolean) to authenticated;

-- Releases the equipment (coordinator only): closes the open episode and makes it active again. An
-- equipment that was put in 'maintenance' by hand, without an episode, is simply made active.
create function public.end_equipment_maintenance(p_equipment_id uuid, p_notes text default null)
returns public.equipment_maintenance
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
  v_episode public.equipment_maintenance;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_equipment_id::text));

  select * into v_equipment from public.equipment where id = p_equipment_id for update;

  if not found then
    raise exception 'equipment_not_found' using errcode = 'P0001';
  end if;

  update public.equipment_maintenance
  set ended_at = now(),
      ended_by = auth.uid(),
      resolution_notes = nullif(btrim(coalesce(p_notes, '')), '')
  where equipment_id = p_equipment_id and ended_at is null
  returning * into v_episode;

  if v_episode.id is null and v_equipment.status <> 'maintenance' then
    raise exception 'not_in_maintenance' using errcode = 'P0001';
  end if;

  update public.equipment set status = 'active' where id = p_equipment_id;

  return v_episode;
end;
$$;
alter function public.end_equipment_maintenance(uuid, text) owner to postgres;
revoke all on function public.end_equipment_maintenance(uuid, text) from public;
grant all on function public.end_equipment_maintenance(uuid, text) to authenticated;
