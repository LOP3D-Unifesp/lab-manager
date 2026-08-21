-- 1. New table: a researcher may hold more than one funding grant at once.
create table if not exists "public"."profile_funding_grants" (
    "id" uuid default gen_random_uuid() not null,
    "profile_id" uuid not null,
    "agency" "public"."funding_agency" not null,
    "agency_other" text,
    "created_at" timestamp with time zone default now() not null,
    constraint "profile_funding_grants_pkey" primary key ("id"),
    constraint "profile_funding_grants_profile_id_fkey"
        foreign key ("profile_id") references "public"."profiles"("id") on delete cascade,
    constraint "profile_funding_grants_agency_other_check" check (
        (("agency" = 'other'::public.funding_agency) and ("agency_other" is not null) and (length(btrim("agency_other")) > 0))
        or (("agency" <> 'other'::public.funding_agency) and ("agency_other" is null))
    )
);
alter table "public"."profile_funding_grants" owner to "postgres";
alter table "public"."profile_funding_grants" enable row level security;

-- 2. Carry forward existing single-value data before dropping the old columns.
insert into "public"."profile_funding_grants" (profile_id, agency, agency_other)
select id, funding_agency, funding_agency_other
from "public"."profiles"
where has_funding_grant and funding_agency is not null;

-- 3. RLS mirroring availability_slots: any active user reads, owner or coordinator writes.
create policy "active users read funding grants" on "public"."profile_funding_grants"
    for select to "authenticated" using ("private"."has_active_profile"());
create policy "users manage own funding grants" on "public"."profile_funding_grants"
    to "authenticated" using (("profile_id" = "auth"."uid"())) with check (("profile_id" = "auth"."uid"()));
create policy "coordinators manage funding grants" on "public"."profile_funding_grants"
    to "authenticated" using ("private"."is_coordinator"()) with check ("private"."is_coordinator"());

grant all on table "public"."profile_funding_grants" to "authenticated";
grant all on table "public"."profile_funding_grants" to "service_role";

-- 4. Transactional replace RPC, same idiom as replace_profile_availability.
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
      as grant_row(agency public.funding_agency, agency_other text)
    where agency is null
      or (agency = 'other' and (agency_other is null or length(btrim(agency_other)) = 0))
      or (agency <> 'other' and agency_other is not null)
  ) then
    raise exception 'invalid_grants' using errcode = 'P0001';
  end if;

  delete from public.profile_funding_grants where profile_id = p_profile_id;

  insert into public.profile_funding_grants (profile_id, agency, agency_other)
  select p_profile_id, agency, agency_other
  from jsonb_to_recordset(coalesce(p_grants, '[]'::jsonb))
    as grant_row(agency public.funding_agency, agency_other text);

  return query
  select * from public.profile_funding_grants
  where profile_id = p_profile_id
  order by created_at;
end;
$$;
alter function "public"."replace_profile_funding_grants"(uuid, jsonb) owner to "postgres";
revoke all on function "public"."replace_profile_funding_grants"(uuid, jsonb) from public;
grant all on function "public"."replace_profile_funding_grants"(uuid, jsonb) to "authenticated";

-- 5. Drop the now-redundant scalar columns/constraint from profiles.
alter table "public"."profiles" drop constraint if exists "profiles_funding_grant_check";
alter table "public"."profiles" drop column if exists "has_funding_grant";
alter table "public"."profiles" drop column if exists "funding_agency";
alter table "public"."profiles" drop column if exists "funding_agency_other";

-- 6. Recreate create_profile/update_my_profile without the funding params.
--    Parameter lists change, so these must be dropped and recreated (not CREATE OR REPLACE).
drop function if exists "public"."create_profile"("text", "public"."academic_affiliation", boolean, "public"."funding_agency", "text", integer, "text", character, "text", "text", "date", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text");

create function "public"."create_profile"(
    "p_full_name" text,
    "p_academic_affiliation" "public"."academic_affiliation" default null::"public"."academic_affiliation",
    "p_weekly_workload_hours" integer default null::integer,
    "p_lattes_url" text default null::text,
    "p_nationality_country_code" character default null::"bpchar",
    "p_phone" text default null::text,
    "p_bio" text default null::text,
    "p_birth_date" date default null::date,
    "p_cpf" text default null::text,
    "p_rg" text default null::text,
    "p_postal_code" text default null::text,
    "p_street" text default null::text,
    "p_address_number" text default null::text,
    "p_address_complement" text default null::text,
    "p_neighborhood" text default null::text,
    "p_city" text default null::text,
    "p_state" text default null::text,
    "p_country" text default null::text
) returns "public"."profiles"
    language plpgsql security definer
    set search_path to 'public', 'auth', 'private'
    as $$
declare
  v_email text;
  v_invitation public.invitations;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  if v_email = '' then
    raise exception 'authenticated_email_required' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_full_name, ''))) = 0 then
    raise exception 'full_name_required' using errcode = 'P0001';
  end if;

  perform private.expire_pending_invitations();

  select * into v_invitation
  from public.invitations
  where email = v_email
    and status = 'pending'
    and expires_at > now()
    and auth_user_id = auth.uid()
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'valid_invitation_required' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_exists' using errcode = 'P0001';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    academic_affiliation,
    weekly_workload_hours,
    lattes_url,
    nationality_country_code,
    phone,
    bio,
    is_active
  ) values (
    auth.uid(),
    btrim(p_full_name),
    v_email,
    v_invitation.role,
    p_academic_affiliation,
    p_weekly_workload_hours,
    nullif(btrim(coalesce(p_lattes_url, '')), ''),
    p_nationality_country_code,
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_bio, '')), ''),
    true
  ) returning * into v_profile;

  insert into public.profile_private_data (
    profile_id,
    birth_date,
    cpf,
    rg,
    postal_code,
    street,
    address_number,
    address_complement,
    neighborhood,
    city,
    state,
    country
  ) values (
    auth.uid(),
    p_birth_date,
    nullif(btrim(coalesce(p_cpf, '')), ''),
    nullif(btrim(coalesce(p_rg, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(btrim(coalesce(p_street, '')), ''),
    nullif(btrim(coalesce(p_address_number, '')), ''),
    nullif(btrim(coalesce(p_address_complement, '')), ''),
    nullif(btrim(coalesce(p_neighborhood, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state, '')), ''),
    nullif(btrim(coalesce(p_country, '')), '')
  );

  update public.invitations
  set status = 'accepted',
      email = null,
      auth_user_id = null,
      opened_at = coalesce(opened_at, now()),
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = v_invitation.id;

  return v_profile;
end;
$$;
alter function "public"."create_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) owner to "postgres";
revoke all on function "public"."create_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) from public;
grant all on function "public"."create_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) to "authenticated";

drop function if exists "public"."update_my_profile"("text", "public"."academic_affiliation", boolean, "public"."funding_agency", "text", integer, "text", character, "text", "text", "date", "text", "text", "text", "text", "text", "text", "text", "text", "text", "text");

create function "public"."update_my_profile"(
    "p_full_name" text,
    "p_academic_affiliation" "public"."academic_affiliation" default null::"public"."academic_affiliation",
    "p_weekly_workload_hours" integer default null::integer,
    "p_lattes_url" text default null::text,
    "p_nationality_country_code" character default null::"bpchar",
    "p_phone" text default null::text,
    "p_bio" text default null::text,
    "p_birth_date" date default null::date,
    "p_cpf" text default null::text,
    "p_rg" text default null::text,
    "p_postal_code" text default null::text,
    "p_street" text default null::text,
    "p_address_number" text default null::text,
    "p_address_complement" text default null::text,
    "p_neighborhood" text default null::text,
    "p_city" text default null::text,
    "p_state" text default null::text,
    "p_country" text default null::text
) returns "public"."profiles"
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_full_name, ''))) = 0 then
    raise exception 'full_name_required' using errcode = 'P0001';
  end if;

  update public.profiles
  set full_name = btrim(p_full_name),
      academic_affiliation = p_academic_affiliation,
      weekly_workload_hours = p_weekly_workload_hours,
      lattes_url = nullif(btrim(coalesce(p_lattes_url, '')), ''),
      nationality_country_code = p_nationality_country_code,
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      bio = nullif(btrim(coalesce(p_bio, '')), '')
  where id = auth.uid()
    and is_active
  returning * into v_profile;

  if not found then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  insert into public.profile_private_data (
    profile_id,
    birth_date,
    cpf,
    rg,
    postal_code,
    street,
    address_number,
    address_complement,
    neighborhood,
    city,
    state,
    country
  ) values (
    auth.uid(),
    p_birth_date,
    nullif(btrim(coalesce(p_cpf, '')), ''),
    nullif(btrim(coalesce(p_rg, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(btrim(coalesce(p_street, '')), ''),
    nullif(btrim(coalesce(p_address_number, '')), ''),
    nullif(btrim(coalesce(p_address_complement, '')), ''),
    nullif(btrim(coalesce(p_neighborhood, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state, '')), ''),
    nullif(btrim(coalesce(p_country, '')), '')
  )
  on conflict (profile_id) do update set
    birth_date = excluded.birth_date,
    cpf = excluded.cpf,
    rg = excluded.rg,
    postal_code = excluded.postal_code,
    street = excluded.street,
    address_number = excluded.address_number,
    address_complement = excluded.address_complement,
    neighborhood = excluded.neighborhood,
    city = excluded.city,
    state = excluded.state,
    country = excluded.country;

  return v_profile;
end;
$$;
alter function "public"."update_my_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) owner to "postgres";
revoke all on function "public"."update_my_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) from public;
grant all on function "public"."update_my_profile"(text, "public"."academic_affiliation", integer, text, character, text, text, date, text, text, text, text, text, text, text, text, text, text) to "authenticated";
