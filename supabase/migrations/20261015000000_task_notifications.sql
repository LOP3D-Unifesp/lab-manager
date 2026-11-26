-- Avisos de tarefas no mesmo padrão dos demais assuntos:
--   - assunto próprio "tasks" nas preferências (antes ficavam em "projects", junto dos pedidos de entrada);
--   - mudança de situação de uma tarefa avisa quem a criou e os responsáveis, nunca quem fez a mudança.
-- private.notify continua ignorando quem fez a ação, perfis inativos e quem desligou o assunto.

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status',
    'project_join_request', 'project_join_decision', 'task_assigned', 'task_timer_reminder', 'task_status'
));

alter table public.notification_preferences drop constraint notification_preferences_topic_check;
alter table public.notification_preferences add constraint notification_preferences_topic_check
    check (topic in ('bookings', 'requests', 'purchases', 'feedback', 'projects', 'tasks'));

create or replace function private.notification_topic(p_type text) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type like 'booking\_%' then 'bookings'
    when p_type like 'request\_%' then 'requests'
    when p_type like 'purchase\_%' then 'purchases'
    when p_type like 'feedback\_%' then 'feedback'
    when p_type like 'project\_%' then 'projects'
    when p_type like 'task\_%' then 'tasks'
  end;
$$;

-- Quem já tinha ajustado "Projetos" mantém a mesma escolha para as tarefas.
insert into public.notification_preferences (profile_id, topic, in_app, push)
select profile_id, 'tasks', in_app, push
from public.notification_preferences
where topic = 'projects'
on conflict (profile_id, topic) do nothing;

-- Só quem ainda enxerga o projeto é avisado (quem criou a tarefa pode ter saído dele).
create function private.notify_task_status() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_project text;
  v_by text;
  v_id uuid;
begin
  select name into v_project from public.projects where id = new.project_id;
  select full_name into v_by from public.profiles where id = auth.uid();

  for v_id in
    select pr.id from public.profiles pr
    where pr.is_active
      and (
        pr.id = new.created_by
        or exists (select 1 from public.project_task_assignees a where a.task_id = new.id and a.profile_id = pr.id)
      )
      and (
        pr.role = 'coordinator'
        or exists (select 1 from public.project_members m where m.project_id = new.project_id and m.profile_id = pr.id)
      )
  loop
    perform private.notify(
      v_id, 'task_status',
      jsonb_build_object('task', new.title, 'project', v_project, 'status', new.status, 'by', v_by),
      '/projetos/' || new.project_id, new.id
    );
  end loop;

  return new;
end;
$$;
alter function private.notify_task_status() owner to postgres;
revoke all on function private.notify_task_status() from public;

create trigger project_tasks_notify_status after update of status on public.project_tasks
    for each row when (old.status is distinct from new.status)
    execute function private.notify_task_status();
