-- Proteções contra timer esquecido ligado:
--   1. Aviso (sino e push) depois de N horas ligado.
--   2. Limite ajustável (padrão 8 h) em vez dos 12 h fixos.
--   3. Fim do expediente: o timer para na hora em que acaba o último turno da disponibilidade da pessoa naquele dia
--      (perfil > disponibilidade) mais uma tolerância; só vale se o timer começou antes desse horário.
--   4. Remover a pessoa do projeto ou desativá-la encerra os timers dela.
-- Também corrige o tópico das notificações de tarefa (task_*): elas entram em "Projetos" nas preferências.

alter table public.lab_settings
    add column timer_reminder_hours smallint default 4 not null,
    add column timer_max_hours smallint default 8 not null,
    add column timer_grace_minutes smallint default 60 not null,
    add constraint lab_settings_timer_check check (
        timer_reminder_hours between 1 and 24
        and timer_max_hours between 1 and 24
        and timer_reminder_hours < timer_max_hours
        and timer_grace_minutes between 0 and 240
    );

-- Só o coordenador muda (a tabela é só de leitura para os demais).
create or replace function public.update_timer_settings(p_reminder_hours integer, p_max_hours integer, p_grace_minutes integer)
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if p_reminder_hours is null or p_max_hours is null or p_grace_minutes is null
     or p_reminder_hours not between 1 and 24 or p_max_hours not between 1 and 24
     or p_reminder_hours >= p_max_hours or p_grace_minutes not between 0 and 240 then
    raise exception 'invalid_timer_settings' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set timer_reminder_hours = p_reminder_hours,
      timer_max_hours = p_max_hours,
      timer_grace_minutes = p_grace_minutes
  where id = true;
end;
$$;
alter function public.update_timer_settings(integer, integer, integer) owner to postgres;
revoke all on function public.update_timer_settings(integer, integer, integer) from public;
grant all on function public.update_timer_settings(integer, integer, integer) to authenticated;

-- Aviso de timer ligado há muito tempo (uma vez por trecho).
alter table public.project_task_time_entries add column reminded_at timestamp with time zone;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status',
    'project_join_request', 'project_join_decision', 'task_assigned', 'task_timer_reminder'
));

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
    when p_type like 'task\_%' then 'projects'
  end;
$$;

-- Rotina periódica (a cada 15 min): avisa, aplica o fim do expediente e o limite. Devolve quantos trechos encerrou.
create or replace function private.pause_stale_timers() returns integer
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
declare
  v_settings public.lab_settings%rowtype;
  v_entry record;
  v_count integer := 0;
  v_cutoff timestamp with time zone;
  v_last_end time;
  v_day_end timestamp with time zone;
begin
  select * into v_settings from public.lab_settings where id = true;
  if v_settings.id is null then
    return 0;
  end if;

  for v_entry in
    select e.id, e.task_id, e.project_id, e.profile_id, e.started_at, e.reminded_at, t.title as task_title, p.name as project_name
    from public.project_task_time_entries e
    join public.project_tasks t on t.id = e.task_id
    join public.projects p on p.id = e.project_id
    where e.ended_at is null
  loop
    -- Limite de horas seguidas.
    v_cutoff := v_entry.started_at + make_interval(hours => v_settings.timer_max_hours);

    -- Fim do expediente: último turno da disponibilidade da pessoa no dia (no fuso do laboratório) + tolerância.
    select max(s.ends_at) into v_last_end
    from public.availability_slots s
    where s.profile_id = v_entry.profile_id
      and s.weekday = extract(dow from (v_entry.started_at at time zone v_settings.timezone))::integer;
    if v_last_end is not null then
      v_day_end := (((v_entry.started_at at time zone v_settings.timezone)::date + v_last_end) at time zone v_settings.timezone)
                   + make_interval(mins => v_settings.timer_grace_minutes);
      -- Trabalho fora do horário (começou depois do fim do expediente) fica só com o limite de horas.
      if v_entry.started_at < v_day_end and v_day_end < v_cutoff then
        v_cutoff := v_day_end;
      end if;
    end if;

    if v_cutoff <= now() then
      perform private.close_time_entry(v_entry.id, v_cutoff, true);
      v_count := v_count + 1;
    elsif v_entry.reminded_at is null and v_entry.started_at + make_interval(hours => v_settings.timer_reminder_hours) <= now() then
      update public.project_task_time_entries set reminded_at = now() where id = v_entry.id;
      perform private.notify(
        v_entry.profile_id, 'task_timer_reminder',
        jsonb_build_object('task', v_entry.task_title, 'project', v_entry.project_name, 'hours', v_settings.timer_reminder_hours),
        '/projetos/' || v_entry.project_id, v_entry.task_id
      );
    end if;
  end loop;
  return v_count;
end;
$$;

-- Saiu do projeto ou foi desativada: o timer dela não tem mais dono presente.
create or replace function private.stop_timers_on_member_removed() returns trigger
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
declare
  v_entry record;
begin
  for v_entry in
    select id from public.project_task_time_entries
    where profile_id = old.profile_id and project_id = old.project_id and ended_at is null
  loop
    perform private.close_time_entry(v_entry.id, now());
  end loop;
  return old;
end;
$$;
alter function private.stop_timers_on_member_removed() owner to postgres;
create trigger project_members_stop_timers after delete on public.project_members
    for each row execute function private.stop_timers_on_member_removed();

create or replace function private.stop_timers_on_profile_deactivated() returns trigger
    language plpgsql security definer
    set search_path to 'public', 'private'
as $$
declare
  v_entry record;
begin
  for v_entry in
    select id from public.project_task_time_entries where profile_id = new.id and ended_at is null
  loop
    perform private.close_time_entry(v_entry.id, now());
  end loop;
  return new;
end;
$$;
alter function private.stop_timers_on_profile_deactivated() owner to postgres;
create trigger profiles_stop_timers after update of is_active on public.profiles
    for each row when (old.is_active and not new.is_active)
    execute function private.stop_timers_on_profile_deactivated();
