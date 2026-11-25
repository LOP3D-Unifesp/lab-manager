-- Cronômetro das tarefas: um por tarefa, ligado pela coluna. O tempo de trabalho (Em andamento) e o de revisão
-- (Em revisão) são somados à parte; o total é a soma dos dois.
--   Em andamento -> liga o trabalho; Em revisão -> liga a revisão;
--   A fazer / Finalizado -> para (o tempo fica guardado); arquivar também pausa.
-- O botão Pausar/Retomar (set_task_timer) só vale em Em andamento e Em revisão.

alter table public.project_tasks
    add column work_seconds integer default 0 not null,
    add column review_seconds integer default 0 not null,
    add column timer_phase text,
    add column timer_started_at timestamp with time zone,
    add constraint project_tasks_timer_phase_check check (timer_phase in ('work', 'review')),
    add constraint project_tasks_timer_seconds_check check (work_seconds >= 0 and review_seconds >= 0);

-- Fecha o trecho que estava correndo (soma o tempo na fase certa) e, se for o caso, abre o da nova coluna.
create or replace function private.track_task_time() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_elapsed integer;
begin
  if tg_op = 'UPDATE' and old.timer_started_at is not null
     and (new.status is distinct from old.status or (new.archived_at is not null and old.archived_at is null)) then
    v_elapsed := greatest(0, floor(extract(epoch from (now() - old.timer_started_at)))::integer);
    if old.timer_phase = 'review' then
      new.review_seconds := new.review_seconds + v_elapsed;
    else
      new.work_seconds := new.work_seconds + v_elapsed;
    end if;
    new.timer_started_at := null;
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'in_progress' and new.archived_at is null then
      new.timer_phase := 'work';
      new.timer_started_at := now();
    elsif new.status = 'review' and new.archived_at is null then
      new.timer_phase := 'review';
      new.timer_started_at := now();
    else
      new.timer_phase := null;
      new.timer_started_at := null;
    end if;
  end if;
  return new;
end;
$$;
alter function private.track_task_time() owner to postgres;
create trigger project_tasks_track_time before insert or update of status, archived_at on public.project_tasks
    for each row execute function private.track_task_time();

-- Pausar / retomar o cronômetro da tarefa (só em Em andamento e Em revisão).
create or replace function public.set_task_timer(p_task_id uuid, p_running boolean) returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_task public.project_tasks%rowtype;
  v_elapsed integer;
begin
  select * into v_task from public.project_tasks where id = p_task_id for update;

  if v_task.id is null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.can_read_project(v_task.project_id) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  if v_task.status not in ('in_progress', 'review') or v_task.archived_at is not null then
    raise exception 'timer_not_available' using errcode = 'P0001';
  end if;

  if p_running then
    if v_task.timer_started_at is null then
      update public.project_tasks
      set timer_started_at = now(),
          timer_phase = case when status = 'review' then 'review' else 'work' end
      where id = p_task_id;
    end if;
  elsif v_task.timer_started_at is not null then
    v_elapsed := greatest(0, floor(extract(epoch from (now() - v_task.timer_started_at)))::integer);
    update public.project_tasks
    set work_seconds = work_seconds + case when v_task.timer_phase = 'review' then 0 else v_elapsed end,
        review_seconds = review_seconds + case when v_task.timer_phase = 'review' then v_elapsed else 0 end,
        timer_started_at = null
    where id = p_task_id;
  end if;
end;
$$;
alter function public.set_task_timer(uuid, boolean) owner to postgres;
revoke all on function public.set_task_timer(uuid, boolean) from public;
grant all on function public.set_task_timer(uuid, boolean) to authenticated;

-- Tarefas que já estão em andamento ou em revisão passam a contar a partir de agora.
update public.project_tasks
set timer_phase = case when status = 'review' then 'review' else 'work' end,
    timer_started_at = now()
where status in ('in_progress', 'review') and archived_at is null;
