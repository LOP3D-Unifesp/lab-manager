-- Projects area: projects, members and funding (agencies, grants and per-category amounts).
-- Printer bookings and the task board come in later migrations.

-- 1. Enums.
create type "public"."project_status" as enum ('planning', 'active', 'paused', 'completed', 'archived');
alter type "public"."project_status" owner to "postgres";

create type "public"."project_funding_category" as enum ('capital', 'custeio', 'bolsas', 'reserva_tecnica', 'outros');
alter type "public"."project_funding_category" owner to "postgres";

-- 2. Funding agencies: coordinators can register new ones beyond the seeded list.
create table "public"."funding_agencies" (
    "id" uuid default gen_random_uuid() not null,
    "acronym" text not null,
    "name" text,
    "is_active" boolean default true not null,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "funding_agencies_pkey" primary key ("id"),
    constraint "funding_agencies_acronym_check" check (length(btrim("acronym")) > 0)
);
alter table "public"."funding_agencies" owner to "postgres";
create unique index "funding_agencies_acronym_key" on "public"."funding_agencies" (lower(btrim("acronym")));
create trigger "funding_agencies_touch_updated_at" before update on "public"."funding_agencies"
    for each row execute function "public"."touch_updated_at"();

insert into "public"."funding_agencies" ("acronym", "name") values
    ('FAPESP', 'Fundação de Amparo à Pesquisa do Estado de São Paulo'),
    ('CNPq', 'Conselho Nacional de Desenvolvimento Científico e Tecnológico'),
    ('FINEP', 'Financiadora de Estudos e Projetos'),
    ('Embrapii', 'Empresa Brasileira de Pesquisa e Inovação Industrial'),
    ('CAPES', 'Coordenação de Aperfeiçoamento de Pessoal de Nível Superior');

-- 3. Projects.
create table "public"."projects" (
    "id" uuid default gen_random_uuid() not null,
    "name" text not null,
    "description" text,
    "status" "public"."project_status" default 'active' not null,
    "starts_on" date,
    "ends_on" date,
    "created_by" uuid default auth.uid() not null,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "projects_pkey" primary key ("id"),
    constraint "projects_created_by_fkey" foreign key ("created_by") references "public"."profiles"("id") on delete restrict,
    constraint "projects_name_check" check (length(btrim("name")) > 0),
    constraint "projects_dates_check" check ("starts_on" is null or "ends_on" is null or "ends_on" >= "starts_on")
);
alter table "public"."projects" owner to "postgres";
create unique index "projects_name_key" on "public"."projects" (lower(btrim("name")));
create trigger "projects_touch_updated_at" before update on "public"."projects"
    for each row execute function "public"."touch_updated_at"();

create table "public"."project_members" (
    "project_id" uuid not null,
    "profile_id" uuid not null,
    "added_by" uuid default auth.uid(),
    "created_at" timestamp with time zone default now() not null,
    constraint "project_members_pkey" primary key ("project_id", "profile_id"),
    constraint "project_members_project_id_fkey" foreign key ("project_id") references "public"."projects"("id") on delete cascade,
    constraint "project_members_profile_id_fkey" foreign key ("profile_id") references "public"."profiles"("id") on delete cascade,
    constraint "project_members_added_by_fkey" foreign key ("added_by") references "public"."profiles"("id") on delete set null
);
alter table "public"."project_members" owner to "postgres";
create index "project_members_profile_id_idx" on "public"."project_members" ("profile_id");

create table "public"."project_funding" (
    "id" uuid default gen_random_uuid() not null,
    "project_id" uuid not null,
    "agency_id" uuid not null,
    "process_number" text,
    "grant_name" text,
    "starts_on" date,
    "ends_on" date,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "project_funding_pkey" primary key ("id"),
    constraint "project_funding_project_id_fkey" foreign key ("project_id") references "public"."projects"("id") on delete cascade,
    constraint "project_funding_agency_id_fkey" foreign key ("agency_id") references "public"."funding_agencies"("id") on delete restrict,
    constraint "project_funding_dates_check" check ("starts_on" is null or "ends_on" is null or "ends_on" >= "starts_on")
);
alter table "public"."project_funding" owner to "postgres";
create index "project_funding_project_id_idx" on "public"."project_funding" ("project_id");
create trigger "project_funding_touch_updated_at" before update on "public"."project_funding"
    for each row execute function "public"."touch_updated_at"();

-- Granted amount per budget category (capital, custeio, bolsas...). Spending is out of scope.
create table "public"."project_funding_items" (
    "id" uuid default gen_random_uuid() not null,
    "funding_id" uuid not null,
    "category" "public"."project_funding_category" not null,
    "description" text,
    "amount" numeric(14,2) not null,
    "created_at" timestamp with time zone default now() not null,
    constraint "project_funding_items_pkey" primary key ("id"),
    constraint "project_funding_items_funding_id_fkey" foreign key ("funding_id") references "public"."project_funding"("id") on delete cascade,
    constraint "project_funding_items_amount_check" check ("amount" >= 0)
);
alter table "public"."project_funding_items" owner to "postgres";
create index "project_funding_items_funding_id_idx" on "public"."project_funding_items" ("funding_id");

-- 4. Access helpers. Security definer avoids recursive RLS between projects and members.
create or replace function "private"."is_project_member"("p_project_id" uuid) returns boolean
    language sql stable security definer
    set search_path to 'public'
    as $$
  select exists (
    select 1
    from public.project_members m
    join public.profiles p on p.id = m.profile_id
    where m.project_id = p_project_id and m.profile_id = auth.uid() and p.is_active
  );
$$;
alter function "private"."is_project_member"(uuid) owner to "postgres";
revoke all on function "private"."is_project_member"(uuid) from public;
grant all on function "private"."is_project_member"(uuid) to "authenticated";

create or replace function "private"."can_read_project"("p_project_id" uuid) returns boolean
    language sql stable security definer
    set search_path to 'public', 'private'
    as $$
  select private.is_coordinator() or private.is_project_member(p_project_id);
$$;
alter function "private"."can_read_project"(uuid) owner to "postgres";
revoke all on function "private"."can_read_project"(uuid) from public;
grant all on function "private"."can_read_project"(uuid) to "authenticated";

-- 5. RLS.
alter table "public"."funding_agencies" enable row level security;
alter table "public"."projects" enable row level security;
alter table "public"."project_members" enable row level security;
alter table "public"."project_funding" enable row level security;
alter table "public"."project_funding_items" enable row level security;

create policy "active users read funding agencies" on "public"."funding_agencies"
    for select to "authenticated" using ("private"."has_active_profile"());
create policy "coordinators manage funding agencies" on "public"."funding_agencies"
    to "authenticated" using ("private"."is_coordinator"()) with check ("private"."is_coordinator"());

create policy "members and coordinators read projects" on "public"."projects"
    for select to "authenticated" using ("private"."can_read_project"("id"));
create policy "coordinators manage projects" on "public"."projects"
    to "authenticated" using ("private"."is_coordinator"()) with check ("private"."is_coordinator"());

create policy "members and coordinators read project members" on "public"."project_members"
    for select to "authenticated" using ("private"."can_read_project"("project_id"));

create policy "members and coordinators read project funding" on "public"."project_funding"
    for select to "authenticated" using ("private"."can_read_project"("project_id"));

create policy "members and coordinators read project funding items" on "public"."project_funding_items"
    for select to "authenticated" using (
        exists (
            select 1 from "public"."project_funding" f
            where f."id" = "funding_id" and "private"."can_read_project"(f."project_id")
        )
    );

-- Direct writes only where a coordinator edits one row; compound edits go through RPCs.
grant select, insert, update on table "public"."funding_agencies" to "authenticated";
grant select, insert, update on table "public"."projects" to "authenticated";
grant select on table "public"."project_members" to "authenticated";
grant select on table "public"."project_funding" to "authenticated";
grant select on table "public"."project_funding_items" to "authenticated";
grant all on table "public"."funding_agencies" to "service_role";
grant all on table "public"."projects" to "service_role";
grant all on table "public"."project_members" to "service_role";
grant all on table "public"."project_funding" to "service_role";
grant all on table "public"."project_funding_items" to "service_role";

-- 6. Replace the member list of a project (coordinator only).
create or replace function "public"."replace_project_members"("p_project_id" uuid, "p_profile_ids" uuid[])
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_profile_ids, '{}'::uuid[])) as wanted(profile_id)
    where not exists (select 1 from public.profiles p where p.id = wanted.profile_id and p.is_active)
  ) then
    raise exception 'invalid_project_members' using errcode = 'P0001';
  end if;

  delete from public.project_members
  where project_id = p_project_id
    and not (profile_id = any (coalesce(p_profile_ids, '{}'::uuid[])));

  insert into public.project_members (project_id, profile_id, added_by)
  select p_project_id, wanted.profile_id, auth.uid()
  from (select distinct unnest(coalesce(p_profile_ids, '{}'::uuid[])) as profile_id) wanted
  on conflict (project_id, profile_id) do nothing;
end;
$$;
alter function "public"."replace_project_members"(uuid, uuid[]) owner to "postgres";
revoke all on function "public"."replace_project_members"(uuid, uuid[]) from public;
grant all on function "public"."replace_project_members"(uuid, uuid[]) to "authenticated";

-- 7. Replace the funding of a project (coordinator only).
--    p_funding: [{agency_id, process_number, grant_name, starts_on, ends_on,
--                 items: [{category, description, amount}]}]
create or replace function "public"."replace_project_funding"("p_project_id" uuid, "p_funding" jsonb)
    returns void
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_entry jsonb;
  v_funding_id uuid;
  v_item jsonb;
  v_starts date;
  v_ends date;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_funding, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_funding' using errcode = 'P0001';
  end if;

  delete from public.project_funding where project_id = p_project_id;

  for v_entry in select * from jsonb_array_elements(coalesce(p_funding, '[]'::jsonb)) loop
    if jsonb_typeof(v_entry) <> 'object'
       or not exists (
         select 1 from public.funding_agencies a
         where a.id = nullif(v_entry ->> 'agency_id', '')::uuid and a.is_active
       ) then
      raise exception 'invalid_funding' using errcode = 'P0001';
    end if;

    v_starts := nullif(v_entry ->> 'starts_on', '')::date;
    v_ends := nullif(v_entry ->> 'ends_on', '')::date;

    insert into public.project_funding (project_id, agency_id, process_number, grant_name, starts_on, ends_on)
    values (
      p_project_id,
      (v_entry ->> 'agency_id')::uuid,
      nullif(btrim(coalesce(v_entry ->> 'process_number', '')), ''),
      nullif(btrim(coalesce(v_entry ->> 'grant_name', '')), ''),
      v_starts,
      v_ends
    ) returning id into v_funding_id;

    if jsonb_typeof(coalesce(v_entry -> 'items', '[]'::jsonb)) <> 'array' then
      raise exception 'invalid_funding' using errcode = 'P0001';
    end if;

    for v_item in select * from jsonb_array_elements(coalesce(v_entry -> 'items', '[]'::jsonb)) loop
      insert into public.project_funding_items (funding_id, category, description, amount)
      values (
        v_funding_id,
        (v_item ->> 'category')::public.project_funding_category,
        nullif(btrim(coalesce(v_item ->> 'description', '')), ''),
        (v_item ->> 'amount')::numeric
      );
    end loop;
  end loop;
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
       or check_violation or not_null_violation or invalid_parameter_value then
    raise exception 'invalid_funding' using errcode = 'P0001';
end;
$$;
alter function "public"."replace_project_funding"(uuid, jsonb) owner to "postgres";
revoke all on function "public"."replace_project_funding"(uuid, jsonb) from public;
grant all on function "public"."replace_project_funding"(uuid, jsonb) to "authenticated";
