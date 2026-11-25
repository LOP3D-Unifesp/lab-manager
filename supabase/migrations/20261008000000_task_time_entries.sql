-- Tempo por pessoa nas tarefas: cada trecho em que o cronômetro correu vira um registro com quem o ligou
-- (quem moveu a tarefa para Em andamento/Em revisão ou apertou Retomar). Os totais da tarefa
-- (work_seconds/review_seconds) continuam sendo o valor oficial; os registros só dizem de quem foi cada trecho.
-- O tempo guardado antes desta migration não tem pessoa.

create table public.project_task_time_entries (
    id uuid default gen_random_uuid() not null,
    task_id uuid not null,
    project_id uuid not null,
    profile_id uuid not null,
    phase text not null,
    started_at timestamp with time zone default now() not null,
    ended_at timestamp with time zone,
    seconds integer,
    constraint project_task_time_entries_pkey primary key (id),
    -- Trocar a tarefa de projeto leva os registros junto (on update cascade).
    constraint project_task_time_entries_task_fkey foreign key (task_id, project_id)
        references public.project_tasks (id, project_id) on delete cascade on update cascade,
    constraint project_task_time_entries_profile_fkey foreign key (profile_id)
        references public.profiles (id) on delete cascade,
    constraint project_task_time_entries_phase_check check (phase in ('work', 'review')),
    constraint project_task_time_entries_closed_check check (ended_at is null or (seconds is not null and seconds >= 0))
);
alter table public.project_task_time_entries owner to postgres;
create index project_task_time_entries_task_idx on public.project_task_time_entries (task_id, started_at);
create index project_task_time_entries_profile_idx on public.project_task_time_entries (profile_id, started_at);
-- No máximo um trecho aberto por tarefa (um cronômetro por tarefa).
create unique index project_task_time_entries_open_idx on public.project_task_time_entries (task_id) where ended_at is null;

alter table public.project_task_time_entries enable row level security;
create policy "members and coordinators read time entries" on public.project_task_time_entries
    for select to authenticated using (private.can_read_project(project_id));
grant select on table public.project_task_time_entries to authenticated;
grant all on table public.project_task_time_entries to service_role;

-- Acompanha o cronômetro da tarefa: quando um trecho fecha, fecha o registro; quando abre, abre outro para quem
-- fez a ação. Roda depois da mudança (o registro aponta para a tarefa) e olha o resultado final da linha, então
-- vale para o gatilho de coluna e para o botão Pausar/Retomar sem alterá-los. Sem usuário logado (manutenção em
-- SQL) nada é registrado.
create or replace function private.track_time_entries() returns trigger
    language plpgsql security definer
    set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE' and old.timer_started_at is not null then
    update public.project_task_time_entries
    set ended_at = now(),
        seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::integer)
    where task_id = new.id and ended_at is null;
  end if;

  if new.timer_started_at is not null and auth.uid() is not null then
    insert into public.project_task_time_entries (task_id, project_id, profile_id, phase, started_at)
    values (new.id, new.project_id, auth.uid(), coalesce(new.timer_phase, 'work'), new.timer_started_at);
  end if;
  return new;
end;
$$;
alter function private.track_time_entries() owner to postgres;

create trigger project_tasks_time_entries_insert after insert on public.project_tasks
    for each row when (new.timer_started_at is not null)
    execute function private.track_time_entries();
create trigger project_tasks_time_entries_update after update on public.project_tasks
    for each row when (old.timer_started_at is distinct from new.timer_started_at)
    execute function private.track_time_entries();

-- Relatório de tempo no período (trechos recortados pelo período; os abertos contam até agora).
-- Coordenador vê todos; os demais, só o próprio tempo.
create or replace function public.get_task_time_report(p_from timestamp with time zone, p_to timestamp with time zone)
    returns table (profile_id uuid, full_name text, project_id uuid, project_name text, phase text, seconds bigint)
    language sql stable security definer
    set search_path to 'public', 'private'
as $$
  select e.profile_id, p.full_name, e.project_id, pr.name, e.phase,
         sum(greatest(0, floor(extract(epoch from (least(coalesce(e.ended_at, now()), p_to) - greatest(e.started_at, p_from))))))::bigint
  from public.project_task_time_entries e
  join public.profiles p on p.id = e.profile_id
  join public.projects pr on pr.id = e.project_id
  where e.started_at < p_to
    and coalesce(e.ended_at, now()) > p_from
    and (private.is_coordinator() or e.profile_id = auth.uid())
  group by e.profile_id, p.full_name, e.project_id, pr.name, e.phase;
$$;
alter function public.get_task_time_report(timestamp with time zone, timestamp with time zone) owner to postgres;
revoke all on function public.get_task_time_report(timestamp with time zone, timestamp with time zone) from public;
grant all on function public.get_task_time_report(timestamp with time zone, timestamp with time zone) to authenticated;
