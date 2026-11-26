-- Um aviso deixa de ser novidade quando o assunto dele se resolve, para todas as pessoas que o receberam:
--   - reserva aguardando aprovação: a reserva foi decidida ou cancelada;
--   - chamado novo: o chamado foi resolvido ou cancelado;
--   - pedido de compra novo: o pedido foi aprovado, recusado ou cancelado;
--   - pedido para entrar em projeto: foi decidido ou cancelado;
--   - avisos de tarefa: a tarefa foi concluída, arquivada ou apagada (o aviso "concluída" fica para ser lido).
-- Avisos que só informam (decisões e mudanças de situação) continuam novos até serem lidos.
-- Os lidos passam a ficar guardados por 30 dias (antes, 90).

create index notifications_unread_entity_idx on public.notifications (entity_id) where read_at is null;

create function private.resolve_notifications(p_entity uuid, p_types text[]) returns void
language sql
security definer
set search_path = 'public'
as $$
  update public.notifications set read_at = now()
  where entity_id = p_entity and type = any (p_types) and read_at is null;
$$;
alter function private.resolve_notifications(uuid, text[]) owner to postgres;
revoke all on function private.resolve_notifications(uuid, text[]) from public;

-- Para os pedidos que esperam uma decisão: o tipo do aviso vem no argumento do gatilho.
create function private.resolve_subject_notifications() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  perform private.resolve_notifications(new.id, array[tg_argv[0]]);
  return new;
end;
$$;
alter function private.resolve_subject_notifications() owner to postgres;
revoke all on function private.resolve_subject_notifications() from public;

create trigger equipment_bookings_resolve_notifications after update of status on public.equipment_bookings
    for each row when (old.status = 'pending' and new.status <> 'pending')
    execute function private.resolve_subject_notifications('booking_pending');

create trigger maintenance_requests_resolve_notifications after update of status on public.maintenance_requests
    for each row when (old.status is distinct from new.status and new.status in ('resolved', 'cancelled'))
    execute function private.resolve_subject_notifications('request_new');

create trigger purchase_requests_resolve_notifications after update of status on public.purchase_requests
    for each row when (old.status = 'requested' and new.status <> 'requested')
    execute function private.resolve_subject_notifications('purchase_new');

create trigger project_join_requests_resolve_notifications after update of status on public.project_join_requests
    for each row when (old.status = 'pending' and new.status <> 'pending')
    execute function private.resolve_subject_notifications('project_join_request');

-- Tarefas. O aviso "concluída" nasce na mesma mudança, por isso fica de fora ao concluir ou arquivar.
create function private.resolve_task_notifications() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if tg_op = 'DELETE' then
    perform private.resolve_notifications(old.id, array['task_assigned', 'task_timer_reminder', 'task_status']);
    return old;
  end if;

  update public.notifications set read_at = now()
  where entity_id = new.id and read_at is null
    and type in ('task_assigned', 'task_timer_reminder', 'task_status')
    and not (type = 'task_status' and params->>'status' = 'done');
  return new;
end;
$$;
alter function private.resolve_task_notifications() owner to postgres;
revoke all on function private.resolve_task_notifications() from public;

create trigger project_tasks_resolve_notifications after update of status, archived_at on public.project_tasks
    for each row when (
      (new.status = 'done' and old.status <> 'done') or (new.archived_at is not null and old.archived_at is null)
    )
    execute function private.resolve_task_notifications();

create trigger project_tasks_resolve_notifications_on_delete after delete on public.project_tasks
    for each row execute function private.resolve_task_notifications();

-- Mesma função das preferências, agora guardando os lidos por 30 dias.
create or replace function private.notify(p_recipient uuid, p_type text, p_params jsonb, p_link text, p_entity uuid) returns void
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

  if not private.wants_notification(p_recipient, p_type, 'in_app') then
    return;
  end if;

  delete from public.notifications
  where recipient_id = p_recipient and read_at is not null and read_at < now() - interval '30 days';

  insert into public.notifications (recipient_id, type, params, link, entity_id)
  values (p_recipient, p_type, coalesce(p_params, '{}'::jsonb), p_link, p_entity);
end;
$$;

-- Avisos antigos de assuntos que já se resolveram saem das novidades.
update public.notifications n set read_at = now()
where n.read_at is null
  and (
    (n.type = 'booking_pending' and exists (select 1 from public.equipment_bookings b where b.id = n.entity_id and b.status <> 'pending'))
    or (n.type = 'request_new' and exists (select 1 from public.maintenance_requests r where r.id = n.entity_id and r.status in ('resolved', 'cancelled')))
    or (n.type = 'purchase_new' and exists (select 1 from public.purchase_requests p where p.id = n.entity_id and p.status <> 'requested'))
    or (n.type = 'project_join_request' and exists (select 1 from public.project_join_requests j where j.id = n.entity_id and j.status <> 'pending'))
    or (
      n.type in ('task_assigned', 'task_timer_reminder', 'task_status')
      and not (n.type = 'task_status' and n.params->>'status' = 'done')
      and exists (select 1 from public.project_tasks t where t.id = n.entity_id and (t.status = 'done' or t.archived_at is not null))
    )
    or (n.type in ('task_assigned', 'task_timer_reminder', 'task_status') and not exists (select 1 from public.project_tasks t where t.id = n.entity_id))
  );
