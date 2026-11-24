-- Notificações guardadas no banco: histórico e "lido" sincronizados entre aparelhos.
-- Os triggers abaixo criam uma linha por destinatário; o texto é montado no cliente (tipo + params), no idioma de quem lê.
-- Quem fez a ação nunca recebe a própria notificação. As pendências (chamados abertos, compras aguardando, feedback novo)
-- continuam sendo contadas direto das tabelas, porque representam trabalho em aberto, não eventos.

create table public.notifications (
    id uuid default gen_random_uuid() not null,
    recipient_id uuid not null,
    type text not null,
    params jsonb default '{}'::jsonb not null,
    link text,
    entity_id uuid,
    created_at timestamp with time zone default now() not null,
    read_at timestamp with time zone,
    constraint notifications_pkey primary key (id),
    constraint notifications_recipient_id_fkey foreign key (recipient_id) references public.profiles (id) on delete cascade,
    constraint notifications_type_check check (type in (
        'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
        'request_new', 'request_resolved', 'feedback_new', 'purchase_new', 'purchase_status'
    )),
    constraint notifications_link_check check (link is null or (length(link) <= 300 and link like '/%'))
);
alter table public.notifications owner to postgres;
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Cada pessoa lê as próprias e só pode marcar como lida (o grant de coluna abaixo impede mexer no resto).
-- Ninguém insere pelo cliente: só os triggers (security definer).
create policy "users read own notifications" on public.notifications
    for select to authenticated using (recipient_id = auth.uid());
create policy "users mark own notifications read" on public.notifications
    for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "users delete own notifications" on public.notifications
    for delete to authenticated using (recipient_id = auth.uid());

grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

alter publication supabase_realtime add table public.notifications;

-- Cria uma notificação para um destinatário, exceto para quem fez a ação. Também apaga as lidas há mais de 90 dias dele.
create function private.notify(p_recipient uuid, p_type text, p_params jsonb, p_link text, p_entity uuid) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if p_recipient is null or p_recipient is not distinct from auth.uid() then
    return;
  end if;

  if not exists (select 1 from public.profiles where id = p_recipient and is_active) then
    return;
  end if;

  delete from public.notifications
  where recipient_id = p_recipient and read_at is not null and read_at < now() - interval '90 days';

  insert into public.notifications (recipient_id, type, params, link, entity_id)
  values (p_recipient, p_type, coalesce(p_params, '{}'::jsonb), p_link, p_entity);
end;
$$;
alter function private.notify(uuid, text, jsonb, text, uuid) owner to postgres;
revoke all on function private.notify(uuid, text, jsonb, text, uuid) from public;

-- Coordenadores ativos (e, se pedido, também os mantenedores).
create function private.notify_staff(p_include_maintainers boolean, p_type text, p_params jsonb, p_link text, p_entity uuid) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_id uuid;
begin
  for v_id in
    select id from public.profiles
    where is_active and (role = 'coordinator' or (p_include_maintainers and is_maintainer))
  loop
    perform private.notify(v_id, p_type, p_params, p_link, p_entity);
  end loop;
end;
$$;
alter function private.notify_staff(boolean, text, jsonb, text, uuid) owner to postgres;
revoke all on function private.notify_staff(boolean, text, jsonb, text, uuid) from public;

-- Reservas.
create function private.notify_booking_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment text;
  v_params jsonb;
begin
  select name into v_equipment from public.equipment where id = new.equipment_id;
  v_params := jsonb_build_object('project', new.project_name, 'equipment', v_equipment);

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform private.notify_staff(false, 'booking_pending', v_params, '/reservas?reserva=' || new.id, new.id);
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'approved' and old.status = 'pending' then
    perform private.notify(new.profile_id, 'booking_approved', v_params, '/reservas/minhas', new.id);
  elsif new.status = 'rejected' then
    perform private.notify(
      new.profile_id, 'booking_rejected',
      v_params || jsonb_build_object('reason', new.rejected_reason), '/reservas/minhas', new.id
    );
  elsif new.status = 'cancelled' then
    if coalesce(new.cancelled_by, auth.uid()) is distinct from new.profile_id then
      perform private.notify(new.profile_id, 'booking_cancelled', v_params, '/reservas/minhas', new.id);
    else
      perform private.notify_staff(false, 'booking_cancelled', v_params, '/reservas/historico', new.id);
    end if;
  end if;

  return new;
end;
$$;
alter function private.notify_booking_change() owner to postgres;

create trigger equipment_bookings_notify
    after insert or update of status on public.equipment_bookings
    for each row execute function private.notify_booking_change();

-- Chamados de manutenção.
create function private.notify_request_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_equipment text;
  v_params jsonb;
begin
  select name into v_equipment from public.equipment where id = new.equipment_id;
  v_params := jsonb_build_object('equipment', v_equipment, 'urgency', new.urgency);

  if tg_op = 'INSERT' then
    perform private.notify_staff(true, 'request_new', v_params, '/equipamentos?vista=chamados', new.id);
  elsif new.status = 'resolved' and old.status is distinct from 'resolved' then
    perform private.notify(new.requested_by, 'request_resolved', v_params, '/equipamentos?vista=chamados', new.id);
  end if;

  return new;
end;
$$;
alter function private.notify_request_change() owner to postgres;

create trigger maintenance_requests_notify
    after insert or update of status on public.maintenance_requests
    for each row execute function private.notify_request_change();

-- Feedback.
create function private.notify_feedback_new() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  perform private.notify_staff(false, 'feedback_new', jsonb_build_object('kind', new.kind), '/feedback', new.id);
  return new;
end;
$$;
alter function private.notify_feedback_new() owner to postgres;

create trigger feedback_reports_notify
    after insert on public.feedback_reports
    for each row execute function private.notify_feedback_new();

-- Compras: pedido novo para os coordenadores e decisões/andamento para quem pediu.
create function private.notify_purchase_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      perform private.notify_staff(
        false, 'purchase_new', jsonb_build_object('item', new.item, 'urgency', new.urgency), '/compras', new.id
      );
    end if;
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected', 'purchased', 'delivered') then
    perform private.notify(
      new.requested_by, 'purchase_status',
      jsonb_build_object('item', new.item, 'status', new.status, 'reason', new.rejected_reason), '/compras', new.id
    );
  end if;

  return new;
end;
$$;
alter function private.notify_purchase_change() owner to postgres;

create trigger purchase_requests_notify
    after insert or update of status on public.purchase_requests
    for each row execute function private.notify_purchase_change();
