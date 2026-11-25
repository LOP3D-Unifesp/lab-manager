-- A ordem dos cartões passa a valer para a coluna inteira, com os projetos juntos: o quadro geral mistura projetos e
-- a pessoa precisa poder colocar um cartão acima de outro de projeto diferente.

-- 1. Uma tarefa que entra numa coluna vai para o fim dela (considerando todos os projetos).
create or replace function "private"."append_task_to_column"() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.position := coalesce(
      (select max(t.position) from public.project_tasks t where t.status = new.status),
      0
    ) + 1;
  end if;
  return new;
end;
$$;

-- 2. Mover/reordenar: renumera a coluna inteira (todos os projetos). p_before_task_id pode ser de outro projeto.
-- Só as posições mudam; quem não vê um projeto continua sem ver as tarefas dele.
create or replace function "public"."move_project_task"("p_task_id" uuid, "p_status" public.task_status, "p_before_task_id" uuid default null)
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_project_id uuid;
  v_ids uuid[];
  v_index integer;
begin
  select project_id into v_project_id from public.project_tasks where id = p_task_id;

  if v_project_id is null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.can_read_project(v_project_id) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  -- Trava a coluna para dois movimentos simultâneos não se embaralharem.
  perform 1 from public.project_tasks
  where status = p_status or id = p_task_id
  order by id
  for update;

  update public.project_tasks set status = p_status where id = p_task_id and status is distinct from p_status;

  select coalesce(array_agg(t.id order by t.position, lower(t.title), t.id), '{}'::uuid[])
    into v_ids
  from public.project_tasks t
  where t.status = p_status and t.id <> p_task_id;

  v_index := case when p_before_task_id is null then null else array_position(v_ids, p_before_task_id) end;

  if v_index is null then
    v_ids := v_ids || p_task_id;
  else
    v_ids := v_ids[1:v_index - 1] || p_task_id || v_ids[v_index:array_length(v_ids, 1)];
  end if;

  update public.project_tasks t
  set position = ordered.new_position
  from (select id, ordinality::integer as new_position from unnest(v_ids) with ordinality as u(id, ordinality)) ordered
  where t.id = ordered.id and t.position is distinct from ordered.new_position;
end;
$$;

-- 3. Posições existentes: cada coluna vira uma fila única (antes cada projeto tinha a sua), mantendo a ordem relativa
-- dentro de cada projeto e desempatando por título, como o quadro já mostrava.
with ranked as (
  select id, row_number() over (partition by status order by position, lower(title), id)::integer as new_position
  from public.project_tasks
)
update public.project_tasks t
set position = ranked.new_position
from ranked
where t.id = ranked.id and t.position is distinct from ranked.new_position;

-- 4. Trocar a tarefa de projeto. As FKs compostas (responsáveis e checklist) prendem esses registros ao projeto da
-- tarefa, então eles são tirados e recolocados: ficam só os responsáveis que também são membros do novo projeto.
-- O aviso "tarefa atribuída" não dispara de novo para quem já era responsável.
create or replace function "private"."notify_task_assigned"() returns trigger
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_task text;
  v_project text;
  v_by text;
begin
  if new.profile_id = auth.uid() or current_setting('app.moving_task', true) = 'on' then
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

create or replace function "public"."move_task_to_project"("p_task_id" uuid, "p_project_id" uuid)
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_old_project uuid;
  v_assignees uuid[];
  v_items jsonb;
begin
  select project_id into v_old_project from public.project_tasks where id = p_task_id;

  if v_old_project is null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.can_read_project(v_old_project) or not private.can_read_project(p_project_id) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  if v_old_project = p_project_id then
    return;
  end if;

  select coalesce(array_agg(a.profile_id), '{}'::uuid[]) into v_assignees
  from public.project_task_assignees a
  join public.project_members m on m.project_id = p_project_id and m.profile_id = a.profile_id
  where a.task_id = p_task_id;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.position), '[]'::jsonb) into v_items
  from public.project_task_checklist_items i
  where i.task_id = p_task_id;

  delete from public.project_task_assignees where task_id = p_task_id;
  delete from public.project_task_checklist_items where task_id = p_task_id;

  update public.project_tasks set project_id = p_project_id where id = p_task_id;

  perform set_config('app.moving_task', 'on', true);
  insert into public.project_task_assignees (task_id, project_id, profile_id)
  select p_task_id, p_project_id, profile_id from unnest(v_assignees) as profile_id;
  perform set_config('app.moving_task', 'off', true);

  insert into public.project_task_checklist_items (id, task_id, project_id, title, done, position)
  select (item ->> 'id')::uuid, p_task_id, p_project_id, item ->> 'title', (item ->> 'done')::boolean, (item ->> 'position')::integer
  from jsonb_array_elements(v_items) item;
end;
$$;
alter function "public"."move_task_to_project"(uuid, uuid) owner to "postgres";
revoke all on function "public"."move_task_to_project"(uuid, uuid) from public;
grant all on function "public"."move_task_to_project"(uuid, uuid) to "authenticated";
