-- Bolsas de fomento ligadas a um projeto, com período e número do processo.
-- As colunas ficam opcionais no banco para não quebrar bolsas antigas; a tela exige os campos nas bolsas novas.
alter table "public"."profile_funding_grants"
  add column "project_id" uuid,
  add column "start_date" date,
  add column "end_date" date,
  add column "process_number" text;

alter table "public"."profile_funding_grants"
  add constraint "profile_funding_grants_project_id_fkey"
    foreign key ("project_id") references "public"."projects"("id") on delete set null,
  add constraint "profile_funding_grants_dates_check"
    check (("start_date" is null) or ("end_date" is null) or ("end_date" >= "start_date")),
  add constraint "profile_funding_grants_process_number_check"
    check (("process_number" is null) or ((length(btrim("process_number")) > 0) and (length("process_number") <= 60)));

create index "profile_funding_grants_project_id_idx" on "public"."profile_funding_grants" ("project_id");

-- As bolsas do projeto SUS são pagas pela FAP: SUS deixa de ser agência. O valor do enum fica (remover valor de enum
-- não é seguro), mas os dados antigos passam para FAP e a RPC recusa novos registros com SUS.
update "public"."profile_funding_grants" set "agency" = 'fap' where "agency" = 'sus';

create or replace function "public"."replace_profile_funding_grants"("p_profile_id" uuid, "p_grants" jsonb)
    returns setof "public"."profile_funding_grants"
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_hours integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_profile_id <> auth.uid() and not private.is_coordinator() then
    raise exception 'funding_grants_forbidden' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_grants, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_grants, '[]'::jsonb))
      as grant_row(
        agency public.funding_agency,
        agency_other text,
        project_id uuid,
        start_date date,
        end_date date,
        process_number text
      )
    where agency is null
      or agency = 'sus'
      or (agency = 'other' and (agency_other is null or length(btrim(agency_other)) = 0))
      or (agency <> 'other' and agency_other is not null)
      or (start_date is not null and end_date is not null and end_date < start_date)
      or (project_id is not null and not exists (select 1 from public.projects p where p.id = grant_row.project_id))
  ) then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  delete from public.profile_funding_grants where profile_id = p_profile_id;

  insert into public.profile_funding_grants (
    profile_id, agency, agency_other, grant_name, weekly_hours, monthly_value,
    project_id, start_date, end_date, process_number
  )
  select
    p_profile_id, agency, agency_other,
    nullif(btrim(coalesce(grant_name, '')), ''), weekly_hours, monthly_value,
    project_id, start_date, end_date, nullif(btrim(coalesce(process_number, '')), '')
  from jsonb_to_recordset(coalesce(p_grants, '[]'::jsonb))
    as grant_row(
      agency public.funding_agency,
      agency_other text,
      grant_name text,
      weekly_hours integer,
      monthly_value numeric,
      project_id uuid,
      start_date date,
      end_date date,
      process_number text
    );

  -- A carga semanal de quem tem bolsa vigente é a soma das horas das bolsas vigentes (sem data conta como vigente).
  select coalesce(sum(weekly_hours), 0) into v_hours
  from public.profile_funding_grants
  where profile_id = p_profile_id
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date);

  if v_hours > 0 then
    update public.profiles set weekly_workload_hours = least(v_hours, 60) where id = p_profile_id;
  end if;

  return query
  select * from public.profile_funding_grants
  where profile_id = p_profile_id
  order by created_at;
end;
$$;
alter function "public"."replace_profile_funding_grants"(uuid, jsonb) owner to "postgres";
