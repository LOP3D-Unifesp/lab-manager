-- Maintenance requests get photos, and an urgent request blocks the equipment right away.

-- Photos live in a private bucket, one folder per author ("<profile_id>/<file>"). The request keeps the
-- object paths; the app reads them through signed URLs.
alter table public.maintenance_requests
    add column photo_paths text[] default '{}' not null,
    add constraint maintenance_requests_photo_paths_check check (cardinality(photo_paths) <= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-photos', 'maintenance-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "users upload own maintenance photos" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'maintenance-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
        and private.has_active_profile()
    );
create policy "active users read maintenance photos" on storage.objects
    for select to authenticated
    using (bucket_id = 'maintenance-photos' and private.has_active_profile());

-- An urgent request puts an active equipment in maintenance as soon as it is opened. Future bookings are
-- not cancelled: the maintainers are warned and decide. Releasing is always manual (end_equipment_maintenance).
create function private.block_equipment_on_urgent_request() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment public.equipment;
begin
  if new.urgency <> 'urgent' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.equipment_id::text));

  select * into v_equipment from public.equipment where id = new.equipment_id for update;

  if found and v_equipment.status = 'active'
     and not exists (select 1 from public.equipment_maintenance where equipment_id = new.equipment_id and ended_at is null) then
    insert into public.equipment_maintenance (equipment_id, reason, started_by)
    values (new.equipment_id, 'Chamado urgente: ' || left(btrim(new.description), 200), new.requested_by);

    update public.equipment set status = 'maintenance' where id = new.equipment_id;
  end if;

  return new;
end;
$$;
alter function private.block_equipment_on_urgent_request() owner to postgres;
revoke all on function private.block_equipment_on_urgent_request() from public;

create trigger maintenance_requests_block_on_urgent after insert on public.maintenance_requests
    for each row execute function private.block_equipment_on_urgent_request();
