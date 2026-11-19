-- Kanban of tasks inside each project. A task can have several assignees, all of them project members.

create type "public"."task_status" as enum ('todo', 'in_progress', 'review', 'done');
alter type "public"."task_status" owner to "postgres";

create table "public"."project_tasks" (
    "id" uuid default gen_random_uuid() not null,
    "project_id" uuid not null,
    "title" text not null,
    "description" text,
    "status" "public"."task_status" default 'todo' not null,
    "position" integer default 0 not null,
    "due_on" date,
    "created_by" uuid default auth.uid() not null,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "project_tasks_pkey" primary key ("id"),
    constraint "project_tasks_id_project_id_key" unique ("id", "project_id"),
    constraint "project_tasks_project_id_fkey" foreign key ("project_id") references "public"."projects"("id") on delete cascade,
    constraint "project_tasks_created_by_fkey" foreign key ("created_by") references "public"."profiles"("id") on delete restrict,
    constraint "project_tasks_title_check" check (length(btrim("title")) > 0)
);
alter table "public"."project_tasks" owner to "postgres";
create index "project_tasks_project_status_idx" on "public"."project_tasks" ("project_id", "status", "position");
create trigger "project_tasks_touch_updated_at" before update on "public"."project_tasks"
    for each row execute function "public"."touch_updated_at"();

-- The composite foreign keys keep an assignee inside the task's project, and removing a member
-- from the project removes them from its tasks.
create table "public"."project_task_assignees" (
    "task_id" uuid not null,
    "project_id" uuid not null,
    "profile_id" uuid not null,
    "created_at" timestamp with time zone default now() not null,
    constraint "project_task_assignees_pkey" primary key ("task_id", "profile_id"),
    constraint "project_task_assignees_task_fkey" foreign key ("task_id", "project_id")
        references "public"."project_tasks"("id", "project_id") on delete cascade,
    constraint "project_task_assignees_member_fkey" foreign key ("project_id", "profile_id")
        references "public"."project_members"("project_id", "profile_id") on delete cascade,
    -- Direct link to profiles so the API can embed the assignee name and avatar.
    constraint "project_task_assignees_profile_id_fkey" foreign key ("profile_id")
        references "public"."profiles"("id") on delete cascade
);
alter table "public"."project_task_assignees" owner to "postgres";
create index "project_task_assignees_profile_id_idx" on "public"."project_task_assignees" ("profile_id");

-- A task entering a column (created or moved) goes to the end of it. Done in the database because a
-- client only sees part of the board (for instance, only its own tasks on the dashboard).
create or replace function "private"."append_task_to_column"() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.position := coalesce(
      (select max(t.position) from public.project_tasks t where t.project_id = new.project_id and t.status = new.status),
      0
    ) + 1;
  end if;
  return new;
end;
$$;
alter function "private"."append_task_to_column"() owner to "postgres";
create trigger "project_tasks_append_to_column" before insert or update of status on "public"."project_tasks"
    for each row execute function "private"."append_task_to_column"();

alter table "public"."project_tasks" enable row level security;
alter table "public"."project_task_assignees" enable row level security;

-- Members and coordinators read, create and move tasks; only the creator or a coordinator deletes.
create policy "members and coordinators read tasks" on "public"."project_tasks"
    for select to "authenticated" using ("private"."can_read_project"("project_id"));
create policy "members and coordinators create tasks" on "public"."project_tasks"
    for insert to "authenticated" with check (
        "private"."can_read_project"("project_id") and "created_by" = auth.uid()
    );
create policy "members and coordinators update tasks" on "public"."project_tasks"
    for update to "authenticated"
    using ("private"."can_read_project"("project_id"))
    with check ("private"."can_read_project"("project_id"));
create policy "creators and coordinators delete tasks" on "public"."project_tasks"
    for delete to "authenticated" using (
        "private"."can_read_project"("project_id")
        and ("created_by" = auth.uid() or "private"."is_coordinator"())
    );

create policy "members and coordinators read task assignees" on "public"."project_task_assignees"
    for select to "authenticated" using ("private"."can_read_project"("project_id"));

grant select, insert, update, delete on table "public"."project_tasks" to "authenticated";
grant select on table "public"."project_task_assignees" to "authenticated";
grant all on table "public"."project_tasks" to "service_role";
grant all on table "public"."project_task_assignees" to "service_role";

-- Replace the assignees of a task (project members and coordinators), validating membership.
create or replace function "public"."set_task_assignees"("p_task_id" uuid, "p_profile_ids" uuid[])
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

  if exists (
    select 1
    from unnest(coalesce(p_profile_ids, '{}'::uuid[])) as wanted(profile_id)
    where not exists (
      select 1 from public.project_members m
      where m.project_id = v_project_id and m.profile_id = wanted.profile_id
    )
  ) then
    raise exception 'assignee_must_be_project_member' using errcode = 'P0001';
  end if;

  delete from public.project_task_assignees
  where task_id = p_task_id
    and not (profile_id = any (coalesce(p_profile_ids, '{}'::uuid[])));

  insert into public.project_task_assignees (task_id, project_id, profile_id)
  select p_task_id, v_project_id, wanted.profile_id
  from (select distinct unnest(coalesce(p_profile_ids, '{}'::uuid[])) as profile_id) wanted
  on conflict (task_id, profile_id) do nothing;
end;
$$;
alter function "public"."set_task_assignees"(uuid, uuid[]) owner to "postgres";
revoke all on function "public"."set_task_assignees"(uuid, uuid[]) from public;
grant all on function "public"."set_task_assignees"(uuid, uuid[]) to "authenticated";
