-- Quanto a tarefa levou para ser concluída: da criação (created_at) até entrar em Finalizado (completed_at).
-- Independe do cronômetro. Reabrir a tarefa (sair de Finalizado) limpa a data; finalizar de novo marca outra.

alter table public.project_tasks add column completed_at timestamp with time zone;

create or replace function private.track_task_completion() returns trigger
    language plpgsql
    set search_path to 'public'
as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
alter function private.track_task_completion() owner to postgres;

create trigger project_tasks_track_completion before insert or update of status on public.project_tasks
    for each row execute function private.track_task_completion();

-- Tarefas já finalizadas: sem a data exata, usa a última alteração (aproximação).
update public.project_tasks set completed_at = updated_at where status = 'done' and completed_at is null;
