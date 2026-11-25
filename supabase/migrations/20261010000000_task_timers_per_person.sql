-- Cronômetro por pessoa: cada pessoa liga e desliga o seu próprio tempo na tarefa, e várias podem trabalhar ao mesmo
-- tempo ou em horários diferentes. O estado do cronômetro passa a ser os registros de tempo abertos
-- (project_task_time_entries, ended_at nulo); project_tasks.work_seconds/review_seconds continuam sendo a soma
-- dos trechos já fechados de todos (inclusive o tempo antigo, sem pessoa).
--
-- Regras:
--   * Pausar/Retomar (set_task_timer) é sempre do próprio usuário.
--   * Mover Em andamento <-> Em revisão: quem está com o timer ligado continua, trocando de fase.
--   * Mover para A fazer, Finalizado ou arquivar: para o timer de todos, na hora do movimento.
--   * Mover de A fazer/Finalizado para Em andamento/Em revisão liga só o timer de quem moveu, e só se for responsável
--     pela tarefa (mexer no quadro sem ser responsável não conta tempo).
--   * Criar a tarefa já em Em andamento/Em revisão liga o timer de quem criou.
--   * Pausa automática: trecho aberto há mais de 12 h é encerrado em 12 h (rotina a cada 15 min).
--   * adjust_time_entry corrige o fim de um trecho (do próprio usuário; coordenador corrige qualquer um).

alter table public.project_task_time_entries add column auto_closed boolean default false not null;

drop index public.project_task_time_entries_open_idx;
create unique index project_task_time_entries_open_idx on public.project_task_time_entries (task_id, profile_id) where ended_at is null;

-- Abre o trecho de uma pessoa (se ela já tem um aberto, não faz nada).
create or replace function private.open_time_entry(p_task_id uuid, p_project_id uuid, p_profile_id uuid, p_phase text, p_started_at timestamp with time zone default now())
    returns void
    language plpgsql security definer
    set search_path to 'public'
as $$
begin
  if p_profile_id is null then
    return;
  end if;
  insert into public.project_task_time_entries (task_id, project_id, profile_id, phase, started_at)
  values (p_task_id, p_project_id, p_profile_id, p_phase, p_started_at)
  on conflict (task_id, profile_id) where ended_at is null do nothing;
end;
$$;
alter function private.open_time_entry(uuid, uuid, uuid, text, timestamp with time zone) owner to postgres;

-- Fecha um trecho aberto em p_ended_at e soma os segundos no total da tarefa (na fase do trecho).
create or replace function private.close_time_entry(p_entry_id uuid, p_ended_at timestamp with time zone, p_auto boolean default false)
    returns void
    language plpgsql security definer
    set search_path to 'public'
as $$
declare
  v_entry public.project_task_time_entries%rowtype;
  v_seconds integer;
begin
  select * into v_entry from public.project_task_time_entries where id = p_entry_id and ended_at is null for update;
  if v_entry.id is null then
    return;
  end if;

  v_seconds := greatest(0, floor(extract(epoch from (p_ended_at - v_entry.started_at)))::integer);
  update public.project_task_time_entries
  set ended_at = greatest(p_ended_at, v_entry.started_at), seconds = v_seconds, auto_closed = p_auto
  where id = p_entry_id;

  update public.project_tasks
  set work_seconds = work_seconds + case when v_entry.phase = 'review' then 0 else v_seconds end,
      review_seconds = review_seconds + case when v_entry.phase = 'review' then v_seconds else 0 end
  where id = v_entry.task_id;
end;
$$;
alter function private.close_time_entry(uuid, timestamp with time zone, boolean) owner to postgres;

-- Tempo que estava correndo no modelo antigo (um cronômetro por tarefa) é fechado agora: primeiro o que não tem
-- registro, depois os registros abertos (que somam sozinhos).
update public.project_tasks t
set work_seconds = work_seconds + case when timer_phase = 'review' then 0 else greatest(0, floor(extract(epoch from (now() - timer_started_at)))::integer) end,
    review_seconds = review_seconds + case when timer_phase = 'review' then greatest(0, floor(extract(epoch from (now() - timer_started_at)))::integer) else 0 end
where timer_started_at is not null
  and not exists (select 1 from public.project_task_time_entries e where e.task_id = t.id and e.ended_at is null);

do $$
declare
  v_entry record;
begin
  for v_entry in select id from public.project_task_time_entries where ended_at is null loop
    perform private.close_time_entry(v_entry.id, now());
  end loop;
end;
$$;

drop trigger project_tasks_track_time on public.project_tasks;
drop trigger project_tasks_time_entries_insert on public.project_tasks;
drop trigger project_tasks_time_entries_update on public.project_tasks;
drop function private.track_task_time();
drop function private.track_time_entries();
alter table public.project_tasks drop column timer_started_at, drop column timer_phase;

-- Mudou de coluna ou foi arquivada: ajusta os timers abertos.
create or replace function private.sync_task_timers() returns trigger
    language plpgsql security definer
    set search_path to 'public'
as $$
declare
  v_entry record;
  v_phase text;
begin
  if new.status not in ('in_progress', 'review') or new.archived_at is not null then
    for v_entry in select id from public.project_task_time_entries where task_id = new.id and ended_at is null loop
      perform private.close_time_entry(v_entry.id, now());
    end loop;
    return new;
  end if;

  v_phase := case when new.status = 'review' then 'review' else 'work' end;
  if old.status in ('in_progress', 'review') then
    -- Em andamento <-> Em revisão: quem está trabalhando continua, na fase nova.
    for v_entry in select id, profile_id from public.project_task_time_entries where task_id = new.id and ended_at is null loop
      perform private.close_time_entry(v_entry.id, now());
      perform private.open_time_entry(new.id, new.project_id, v_entry.profile_id, v_phase);
    end loop;
  elsif auth.uid() is not null and exists (
    select 1 from public.project_task_assignees a where a.task_id = new.id and a.profile_id = auth.uid()
  ) then
    perform private.open_time_entry(new.id, new.project_id, auth.uid(), v_phase);
  end if;
  return new;
end;
$$;
alter function private.sync_task_timers() owner to postgres;

create trigger project_tasks_sync_timers after update on public.project_tasks
    for each row
    when (old.status is distinct from new.status or (new.archived_at is not null and old.archived_at is null))
    execute function private.sync_task_timers();

-- Tarefa criada já em andamento/revisão: liga o timer de quem criou.
create or replace function private.start_creator_timer() returns trigger
    language plpgsql security definer
    set search_path to 'public'
as $$
begin
  perform private.open_time_entry(new.id, new.project_id, auth.uid(), case when new.status = 'review' then 'review' else 'work' end);
  return new;
end;
$$;
alter function private.start_creator_timer() owner to postgres;

create trigger project_tasks_start_creator_timer after insert on public.project_tasks
    for each row when (new.status in ('in_progress', 'review') and new.archived_at is null)
    execute function private.start_creator_timer();

-- Pausar / retomar o timer de quem chama. Retomar em tarefa A fazer leva a tarefa para Em andamento.
create or replace function public.set_task_timer(p_task_id uuid, p_running boolean) returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
declare
  v_task public.project_tasks%rowtype;
  v_entry_id uuid;
begin
  select * into v_task from public.project_tasks where id = p_task_id for update;

  if v_task.id is null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if auth.uid() is null or not private.can_read_project(v_task.project_id) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  if v_task.status = 'done' or v_task.archived_at is not null then
    raise exception 'timer_not_available' using errcode = 'P0001';
  end if;

  if p_running then
    if v_task.status = 'todo' then
      update public.project_tasks set status = 'in_progress' where id = p_task_id;
      v_task.status := 'in_progress';
    end if;
    perform private.open_time_entry(p_task_id, v_task.project_id, auth.uid(), case when v_task.status = 'review' then 'review' else 'work' end);
  else
    select id into v_entry_id from public.project_task_time_entries
    where task_id = p_task_id and profile_id = auth.uid() and ended_at is null;
    if v_entry_id is not null then
      perform private.close_time_entry(v_entry_id, now());
    end if;
  end if;
end;
$$;
alter function public.set_task_timer(uuid, boolean) owner to postgres;
revoke all on function public.set_task_timer(uuid, boolean) from public;
grant all on function public.set_task_timer(uuid, boolean) to authenticated;

-- Corrige o fim de um trecho (esquecimento de pausar, pausa automática). O dono do trecho ou um coordenador.
create or replace function public.adjust_time_entry(p_entry_id uuid, p_ended_at timestamp with time zone) returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
declare
  v_entry public.project_task_time_entries%rowtype;
  v_ended timestamp with time zone;
  v_seconds integer;
  v_delta integer;
begin
  select * into v_entry from public.project_task_time_entries where id = p_entry_id for update;

  if v_entry.id is null then
    raise exception 'entry_not_found' using errcode = 'P0001';
  end if;

  if auth.uid() is null
     or not private.can_read_project(v_entry.project_id)
     or not (private.is_coordinator() or v_entry.profile_id = auth.uid()) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  v_ended := least(p_ended_at, now());
  if v_ended is null or v_ended < v_entry.started_at then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;

  if v_entry.ended_at is null then
    perform private.close_time_entry(p_entry_id, v_ended);
    return;
  end if;

  v_seconds := floor(extract(epoch from (v_ended - v_entry.started_at)))::integer;
  v_delta := v_seconds - coalesce(v_entry.seconds, 0);
  update public.project_task_time_entries set ended_at = v_ended, seconds = v_seconds, auto_closed = false where id = p_entry_id;
  update public.project_tasks
  set work_seconds = greatest(0, work_seconds + case when v_entry.phase = 'review' then 0 else v_delta end),
      review_seconds = greatest(0, review_seconds + case when v_entry.phase = 'review' then v_delta else 0 end)
  where id = v_entry.task_id;
end;
$$;
alter function public.adjust_time_entry(uuid, timestamp with time zone) owner to postgres;
revoke all on function public.adjust_time_entry(uuid, timestamp with time zone) from public;
grant all on function public.adjust_time_entry(uuid, timestamp with time zone) to authenticated;

-- Pausa automática: trecho aberto há mais de 12 h é encerrado em exatamente 12 h (o tempo além disso não conta).
create or replace function private.pause_stale_timers() returns integer
    language plpgsql security definer
    set search_path to 'public'
as $$
declare
  v_entry record;
  v_count integer := 0;
begin
  for v_entry in
    select id, started_at from public.project_task_time_entries
    where ended_at is null and started_at < now() - interval '12 hours'
  loop
    perform private.close_time_entry(v_entry.id, v_entry.started_at + interval '12 hours', true);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
alter function private.pause_stale_timers() owner to postgres;

select cron.schedule('pause-stale-task-timers', '*/15 * * * *', 'select private.pause_stale_timers()');

-- Quadros ao vivo: ligar/pausar o timer de outra pessoa aparece sem recarregar.
alter publication supabase_realtime add table public.project_task_time_entries;
