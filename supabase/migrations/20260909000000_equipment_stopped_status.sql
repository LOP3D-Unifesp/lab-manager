-- An urgent request now marks the equipment as "stopped" (parado): it stops taking new bookings, but it is
-- only moved to maintenance when a maintainer starts working on the request ("Iniciar manutenção").

alter type public.equipment_status add value if not exists 'stopped';

-- Urgent request: active equipment becomes stopped (no maintenance episode yet).
create or replace function private.block_equipment_on_urgent_request() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if new.urgency = 'urgent' then
    perform pg_advisory_xact_lock(hashtext(new.equipment_id::text));
    update public.equipment set status = 'stopped' where id = new.equipment_id and status = 'active';
  end if;

  return new;
end;
$$;

-- Same function as before, plus: taking a request ("Iniciar manutenção") puts an active or stopped
-- equipment in maintenance, and cancelling or resolving the last urgent request of a stopped equipment
-- brings it back to active (it was only an automatic stop).
create or replace function public.set_maintenance_request_status(
  p_request_id uuid,
  p_status public.maintenance_request_status,
  p_resolution_notes text default null,
  p_assigned_to uuid default null
) returns public.maintenance_requests
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.maintenance_requests;
  v_assignee uuid;
  v_equipment public.equipment;
begin
  if not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_request from public.maintenance_requests where id = p_request_id for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;

  if p_status = v_request.status then
    return v_request;
  end if;

  if not private.can_maintain()
     and not (v_request.requested_by = auth.uid() and v_request.status = 'open' and p_status = 'cancelled') then
    raise exception 'maintainer_required' using errcode = 'P0001';
  end if;

  if v_request.status = 'cancelled' then
    raise exception 'invalid_request_transition' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request.equipment_id::text));

  if p_status = 'in_progress' then
    v_assignee := coalesce(p_assigned_to, auth.uid());
    if not exists (
      select 1 from public.profiles
      where id = v_assignee and is_active and (role = 'coordinator' or is_maintainer)
    ) then
      raise exception 'invalid_assignee' using errcode = 'P0001';
    end if;

    update public.maintenance_requests
    set status = 'in_progress', assigned_to = v_assignee, resolved_at = null
    where id = p_request_id
    returning * into v_request;

    select * into v_equipment from public.equipment where id = v_request.equipment_id for update;

    if found and v_equipment.status in ('active', 'stopped')
       and not exists (select 1 from public.equipment_maintenance where equipment_id = v_equipment.id and ended_at is null) then
      insert into public.equipment_maintenance (equipment_id, reason, started_by)
      values (
        v_equipment.id,
        case when v_request.urgency = 'urgent' then 'Chamado urgente: ' else 'Chamado: ' end
          || left(btrim(v_request.description), 200),
        v_assignee
      );
      update public.equipment set status = 'maintenance' where id = v_equipment.id;
    end if;
  elsif p_status = 'resolved' then
    update public.maintenance_requests
    set status = 'resolved',
        resolved_at = now(),
        resolution_notes = nullif(btrim(coalesce(p_resolution_notes, '')), ''),
        assigned_to = coalesce(assigned_to, auth.uid())
    where id = p_request_id
    returning * into v_request;
  elsif p_status = 'open' then
    update public.maintenance_requests
    set status = 'open', assigned_to = null, resolved_at = null
    where id = p_request_id
    returning * into v_request;
  else
    update public.maintenance_requests
    set status = 'cancelled'
    where id = p_request_id
    returning * into v_request;
  end if;

  if p_status in ('resolved', 'cancelled')
     and not exists (
       select 1 from public.maintenance_requests
       where equipment_id = v_request.equipment_id
         and urgency = 'urgent'
         and status in ('open', 'in_progress')
         and id <> v_request.id
     ) then
    update public.equipment set status = 'active'
    where id = v_request.equipment_id and status = 'stopped';
  end if;

  return v_request;
end;
$$;

-- A stopped equipment can also be released by hand, like one in maintenance.
create or replace function public.end_equipment_maintenance(p_equipment_id uuid, p_notes text default null)
returns public.equipment_maintenance
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
  v_episode public.equipment_maintenance;
begin
  if not private.can_maintain() then
    raise exception 'maintainer_required' using errcode = 'P0001';
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

  if v_episode.id is null and v_equipment.status not in ('maintenance', 'stopped') then
    raise exception 'not_in_maintenance' using errcode = 'P0001';
  end if;

  update public.equipment set status = 'active' where id = p_equipment_id;

  update public.maintenance_requests
  set status = 'resolved',
      resolved_at = now(),
      resolution_notes = coalesce(resolution_notes, nullif(btrim(coalesce(p_notes, '')), ''))
  where equipment_id = p_equipment_id and status = 'in_progress';

  return v_episode;
end;
$$;
