-- Tarefas: prioridade Alta, arquivar (sem apagar) e aviso para quem recebe uma tarefa.

-- 1. Quatro prioridades: baixa, normal, alta e urgente. Só acrescenta o valor; nada o usa nesta transação.
alter type public.task_priority add value if not exists 'high' before 'urgent';

-- 2. Arquivar guarda a tarefa fora do quadro sem perdê-la. Qualquer membro que edita a tarefa pode arquivar
--    (a política de update de project_tasks já cobre); apagar continua só para quem criou ou coordenador.
alter table public.project_tasks add column archived_at timestamptz;
create index project_tasks_archived_idx on public.project_tasks (project_id) where archived_at is not null;

-- 3. Aviso "uma tarefa foi atribuída a você". Quem se atribui a si mesmo não recebe aviso.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status',
    'project_join_request', 'project_join_decision', 'task_assigned'
));

create function private.notify_task_assigned() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_task text;
  v_project text;
  v_by text;
begin
  if new.profile_id = auth.uid() then
    return new;
  end if;

  select t.title, p.name into v_task, v_project
  from public.project_tasks t
  join public.projects p on p.id = t.project_id
  where t.id = new.task_id;

  select full_name into v_by from public.profiles where id = auth.uid();

  perform private.notify(
    new.profile_id, 'task_assigned',
    jsonb_build_object('task', v_task, 'project', v_project, 'by', v_by),
    '/projetos/' || new.project_id, new.task_id
  );
  return new;
end;
$$;
alter function private.notify_task_assigned() owner to postgres;

create trigger project_task_assignees_notify
    after insert on public.project_task_assignees
    for each row execute function private.notify_task_assigned();
