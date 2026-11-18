-- Contract details for each funding grant: name, weekly hours, and monthly stipend.
-- All optional, since a grant can be registered before all the paperwork is in hand.
alter table "public"."profile_funding_grants"
  add column "grant_name" text,
  add column "weekly_hours" integer,
  add column "monthly_value" numeric(10,2);

alter table "public"."profile_funding_grants"
  add constraint "profile_funding_grants_grant_name_check"
    check (("grant_name" is null) or (length(btrim("grant_name")) > 0)),
  add constraint "profile_funding_grants_weekly_hours_check"
    check (("weekly_hours" is null) or (("weekly_hours" >= 1) and ("weekly_hours" <= 60))),
  add constraint "profile_funding_grants_monthly_value_check"
    check (("monthly_value" is null) or ("monthly_value" >= 0));

create or replace function "public"."replace_profile_funding_grants"("p_profile_id" uuid, "p_grants" jsonb)
    returns setof "public"."profile_funding_grants"
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

  if jsonb_typeof(coalesce(p_grants, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_grants, '[]'::jsonb))
      as grant_row(
        agency public.funding_agency,
        agency_other text,
        grant_name text,
        weekly_hours integer,
        monthly_value numeric
      )
    where agency is null
      or (agency = 'other' and (agency_other is null or length(btrim(agency_other)) = 0))
      or (agency <> 'other' and agency_other is not null)
  ) then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  delete from public.profile_funding_grants where profile_id = p_profile_id;

  insert into public.profile_funding_grants (
    profile_id, agency, agency_other, grant_name, weekly_hours, monthly_value
  )
  select
    p_profile_id, agency, agency_other,
    nullif(btrim(coalesce(grant_name, '')), ''), weekly_hours, monthly_value
  from jsonb_to_recordset(coalesce(p_grants, '[]'::jsonb))
    as grant_row(
      agency public.funding_agency,
      agency_other text,
      grant_name text,
      weekly_hours integer,
      monthly_value numeric
    );

  return query
  select * from public.profile_funding_grants
  where profile_id = p_profile_id
  order by created_at;
end;
$$;
alter function "public"."replace_profile_funding_grants"(uuid, jsonb) owner to "postgres";
