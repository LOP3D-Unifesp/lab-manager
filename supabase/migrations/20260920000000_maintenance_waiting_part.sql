-- A maintenance request can wait for a part ("Aguardando peça"). It goes there by itself when a purchase made from
-- the request is marked as purchased (bought, not yet delivered) and comes back when the part is delivered (or the
-- purchase is undone); a maintainer can also set it by hand. The equipment status does not change.

alter type public.maintenance_request_status add value if not exists 'waiting_part';

-- Brings a request in line with its linked purchases: waiting for a part while one is purchased and not delivered.
-- It only goes back (p_revert) when a purchase just left the purchased state, so a request set to wait by hand is kept.
create function private.sync_request_waiting_part(p_request_id uuid, p_revert boolean) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.maintenance_requests;
begin
  select * into v_request from public.maintenance_requests where id = p_request_id for update;

  if not found then
    return;
  end if;

  if exists (
    select 1 from public.purchase_requests where maintenance_request_id = p_request_id and status = 'purchased'
  ) then
    if v_request.status in ('open', 'in_progress') then
      update public.maintenance_requests set status = 'waiting_part', resolved_at = null where id = p_request_id;
    end if;
  elsif p_revert and v_request.status = 'waiting_part' then
    update public.maintenance_requests
    set status = case when assigned_to is not null then 'in_progress'::public.maintenance_request_status else 'open'::public.maintenance_request_status end
    where id = p_request_id;
  end if;
end;
$$;
alter function private.sync_request_waiting_part(uuid, boolean) owner to postgres;
revoke all on function private.sync_request_waiting_part(uuid, boolean) from public;

create function private.purchase_sync_maintenance_request() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if new.maintenance_request_id is not null then
    perform private.sync_request_waiting_part(
      new.maintenance_request_id,
      tg_op = 'UPDATE' and old.status = 'purchased' and new.status <> 'purchased'
    );
  end if;
  return new;
end;
$$;
alter function private.purchase_sync_maintenance_request() owner to postgres;

create trigger purchase_requests_sync_maintenance_request
    after insert or update of status, maintenance_request_id on public.purchase_requests
    for each row execute function private.purchase_sync_maintenance_request();

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
    v_assignee := coalesce(p_assigned_to, case when v_request.status = 'waiting_part' then v_request.assigned_to end, auth.uid());
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
  elsif p_status = 'waiting_part' then
    -- Paused until a part arrives: the request keeps (or gets) a person in charge.
    update public.maintenance_requests
    set status = 'waiting_part', assigned_to = coalesce(assigned_to, auth.uid()), resolved_at = null
    where id = p_request_id
    returning * into v_request;
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
         and status in ('open', 'in_progress', 'waiting_part')
         and id <> v_request.id
     ) then
    update public.equipment set status = 'active'
    where id = v_request.equipment_id and status = 'stopped';
  end if;

  return v_request;
end;
$$;

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
  where equipment_id = p_equipment_id and status in ('in_progress', 'waiting_part');

  return v_episode;
end;
$$;
