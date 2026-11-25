-- Termo de outorga (PDF) anexado à bolsa. Um arquivo por bolsa, visível só para a dona e para os coordenadores.
-- Ao contrário do valor e do nº do processo (que qualquer pessoa ativa lê), o termo pode ter CPF, endereço e dados bancários.

alter table "public"."profile_funding_grants" add column "contract_path" text;
alter table "public"."profile_funding_grants"
  add constraint "profile_funding_grants_contract_path_check"
    check (("contract_path" is null) or (("contract_path" like ("profile_id"::text || '/%')) and ("contract_path" like '%.pdf')));

-- Bucket privado, só PDF, até 10 MB. Pasta por pessoa: "<profile_id>/<arquivo>.pdf".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grant-contracts', 'grant-contracts', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "users upload own grant contracts" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'grant-contracts'
        and (storage.foldername(name))[1] = auth.uid()::text
        and private.has_active_profile()
    );

create policy "owners and coordinators read grant contracts" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'grant-contracts'
        and ((storage.foldername(name))[1] = auth.uid()::text or private.is_coordinator())
    );

create policy "owners and coordinators delete grant contracts" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'grant-contracts'
        and ((storage.foldername(name))[1] = auth.uid()::text or private.is_coordinator())
    );

-- O caminho do arquivo não pode ser lido por qualquer usuário ativo: tira a leitura da coluna nova e devolve a leitura
-- das demais. Quem pode ver o caminho usa get_grant_contracts (e a RPC de salvar, que devolve as linhas da própria pessoa).
revoke select on table "public"."profile_funding_grants" from "authenticated";
grant select (
    "id", "profile_id", "agency", "agency_other", "created_at", "grant_name", "weekly_hours", "monthly_value",
    "project_id", "start_date", "end_date", "process_number"
) on table "public"."profile_funding_grants" to "authenticated";

create or replace function "public"."get_grant_contracts"("p_profile_id" uuid)
    returns table ("grant_id" uuid, "contract_path" text)
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_profile_id <> auth.uid() and not private.is_coordinator() then
    raise exception 'funding_grants_forbidden' using errcode = 'P0001';
  end if;

  return query
  select g.id, g.contract_path
  from public.profile_funding_grants g
  where g.profile_id = p_profile_id and g.contract_path is not null;
end;
$$;
alter function "public"."get_grant_contracts"(uuid) owner to "postgres";
revoke all on function "public"."get_grant_contracts"(uuid) from public;
grant execute on function "public"."get_grant_contracts"(uuid) to "authenticated";

-- Liga (ou, com null, desliga) o termo de uma bolsa já salva e devolve o caminho antigo, para o app apagar o arquivo.
create or replace function "public"."set_grant_contract"("p_grant_id" uuid, "p_path" text)
    returns text
    language plpgsql security definer
    set search_path to 'public', 'private'
    as $$
declare
  v_grant public.profile_funding_grants;
  v_old text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_grant from public.profile_funding_grants where id = p_grant_id;
  if not found then
    raise exception 'grant_not_found' using errcode = 'P0001';
  end if;

  if v_grant.profile_id <> auth.uid() and not private.is_coordinator() then
    raise exception 'funding_grants_forbidden' using errcode = 'P0001';
  end if;

  if p_path is not null and (p_path not like (v_grant.profile_id::text || '/%') or p_path not like '%.pdf') then
    raise exception 'invalid_contract_path' using errcode = 'P0001';
  end if;

  v_old := v_grant.contract_path;
  update public.profile_funding_grants set contract_path = p_path where id = p_grant_id;
  return v_old;
end;
$$;
alter function "public"."set_grant_contract"(uuid, text) owner to "postgres";
revoke all on function "public"."set_grant_contract"(uuid, text) from public;
grant execute on function "public"."set_grant_contract"(uuid, text) to "authenticated";

-- Salvar as bolsas (que apaga e recria as linhas) preserva o termo de cada uma pelo contract_path enviado.
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
        contract_path text
      )
    where agency is null
      or agency = 'sus'
      or (agency = 'other' and (agency_other is null or length(btrim(agency_other)) = 0))
      or (agency <> 'other' and agency_other is not null)
      or (start_date is not null and end_date is not null and end_date < start_date)
      or (project_id is not null and not exists (select 1 from public.projects p where p.id = grant_row.project_id))
      or (contract_path is not null and (contract_path not like (p_profile_id::text || '/%') or contract_path not like '%.pdf'))
  ) then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  delete from public.profile_funding_grants where profile_id = p_profile_id;

  insert into public.profile_funding_grants (
    profile_id, agency, agency_other, grant_name, weekly_hours, monthly_value,
    project_id, start_date, end_date, process_number, contract_path
  )
  select
    p_profile_id, agency, agency_other,
    nullif(btrim(coalesce(grant_name, '')), ''), weekly_hours, monthly_value,
    project_id, start_date, end_date, nullif(btrim(coalesce(process_number, '')), ''), contract_path
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
      process_number text,
      contract_path text
    );

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
