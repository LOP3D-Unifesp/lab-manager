-- Tarefas: checklist (subtarefas), reordenação dentro da coluna e atualização ao vivo dos quadros.

-- 1. Checklist. Cada item pertence a uma tarefa e herda o projeto dela (FK composta), como os responsáveis.
create table "public"."project_task_checklist_items" (
    "id" uuid default gen_random_uuid() not null,
    "task_id" uuid not null,
    "project_id" uuid not null,
    "title" text not null,
    "done" boolean default false not null,
    "position" integer default 0 not null,
    "created_at" timestamp with time zone default now() not null,
    constraint "project_task_checklist_items_pkey" primary key ("id"),
    constraint "project_task_checklist_items_task_fkey" foreign key ("task_id", "project_id")
        references "public"."project_tasks"("id", "project_id") on delete cascade,
    constraint "project_task_checklist_items_title_check" check (length(btrim("title")) > 0 and length("title") <= 200)
);
alter table "public"."project_task_checklist_items" owner to "postgres";
create index "project_task_checklist_items_task_idx" on "public"."project_task_checklist_items" ("task_id", "position");

alter table "public"."project_task_checklist_items" enable row level security;

create policy "members and coordinators read checklist items" on "public"."project_task_checklist_items"
    for select to "authenticated" using ("private"."can_read_project"("project_id"));
-- Marcar/desmarcar direto no cartão. Criar, renomear, ordenar e remover passam por set_task_checklist.
create policy "members and coordinators tick checklist items" on "public"."project_task_checklist_items"
    for update to "authenticated"
    using ("private"."can_read_project"("project_id"))
    with check ("private"."can_read_project"("project_id"));

grant select on table "public"."project_task_checklist_items" to "authenticated";
grant update ("done") on table "public"."project_task_checklist_items" to "authenticated";
grant all on table "public"."project_task_checklist_items" to "service_role";

-- Substitui a checklist de uma tarefa: a ordem do array vira a posição; itens que não estão no array são removidos.
-- Cada item: {"id": uuid, "title": text, "done": boolean}. O id é gerado pelo cliente.
create or replace function "public"."set_task_checklist"("p_task_id" uuid, "p_items" jsonb)
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from public.project_tasks where id = p_task_id;

  if v_project_id is null then
    raise exception 'task_not_found' using errcode = 'P0001';
  end if;

  if not private.can_read_project(v_project_id) then
    raise exception 'project_access_required' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_checklist' using errcode = 'P0001';
  end if;

  delete from public.project_task_checklist_items
  where task_id = p_task_id
    and id not in (
      select (item ->> 'id')::uuid from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
    );

  insert into public.project_task_checklist_items (id, task_id, project_id, title, done, position)
  select (item.value ->> 'id')::uuid,
         p_task_id,
         v_project_id,
         btrim(item.value ->> 'title'),
         coalesce((item.value ->> 'done')::boolean, false),
         item.ordinality::integer
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as item(value, ordinality)
  on conflict (id) do update
    set title = excluded.title,
        done = excluded.done,
        position = excluded.position
    where project_task_checklist_items.task_id = p_task_id;
end;
$$;
alter function "public"."set_task_checklist"(uuid, jsonb) owner to "postgres";
revoke all on function "public"."set_task_checklist"(uuid, jsonb) from public;
grant all on function "public"."set_task_checklist"(uuid, jsonb) to "authenticated";

-- 2. Mover/reordenar. Põe a tarefa na coluna p_status imediatamente antes de p_before_task_id (ou no fim) e
-- renumera a coluna inteira do projeto (1..n). Feito no banco porque o cliente só vê parte do quadro.
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
  where project_id = v_project_id and (status = p_status or id = p_task_id)
  for update;

  -- O gatilho de coluna manda a tarefa para o fim quando o status muda; o renumerar abaixo ajusta a posição.
  update public.project_tasks set status = p_status where id = p_task_id and status is distinct from p_status;

  select coalesce(array_agg(t.id order by t.position, t.created_at, t.id), '{}'::uuid[])
    into v_ids
  from public.project_tasks t
  where t.project_id = v_project_id and t.status = p_status and t.id <> p_task_id;

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
alter function "public"."move_project_task"(uuid, public.task_status, uuid) owner to "postgres";
revoke all on function "public"."move_project_task"(uuid, public.task_status, uuid) from public;
grant all on function "public"."move_project_task"(uuid, public.task_status, uuid) to "authenticated";

-- 3. Quadros ao vivo: mudanças de outras pessoas chegam sem recarregar a página (a RLS vale também no Realtime).
alter publication supabase_realtime add table public.project_tasks;
alter publication supabase_realtime add table public.project_task_assignees;
alter publication supabase_realtime add table public.project_task_checklist_items;
