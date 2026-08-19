


-- Immutable MVP baseline. Future schema changes must use new incremental migrations.
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."academic_affiliation" AS ENUM (
    'ic',
    'extension',
    'intern',
    'tcc',
    'masters',
    'phd',
    'postdoc',
    'visitor',
    'technician',
    'faculty',
    'other'
);


ALTER TYPE "public"."academic_affiliation" OWNER TO "postgres";


CREATE TYPE "public"."funding_agency" AS ENUM (
    'cnpq',
    'fapesp',
    'capes',
    'sus',
    'fap',
    'other'
);


ALTER TYPE "public"."funding_agency" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'pending',
    'approved',
    'in_progress',
    'completed',
    'cancelled',
    'failed'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."printer_status" AS ENUM (
    'active',
    'maintenance',
    'unavailable',
    'disabled'
);


ALTER TYPE "public"."printer_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'coordinator',
    'researcher'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."printer_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "printer_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "project_name" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "estimated_duration_minutes" integer NOT NULL,
    "status" "public"."booking_status" DEFAULT 'approved'::"public"."booking_status" NOT NULL,
    "notes" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "printer_bookings_check" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "printer_bookings_estimated_duration_minutes_check" CHECK (((("estimated_duration_minutes" >= 30) AND ("estimated_duration_minutes" <= 1440)) AND (("estimated_duration_minutes" % 30) = 0))),
    CONSTRAINT "printer_bookings_project_name_check" CHECK (("length"("btrim"("project_name")) > 0))
);


ALTER TABLE "public"."printer_bookings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."cancel_printer_booking_internal"("p_booking_id" "uuid") RETURNS "public"."printer_bookings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_booking public.printer_bookings;
begin
  select * into v_booking
  from public.printer_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if not private.is_coordinator() and v_booking.profile_id <> auth.uid() then
    raise exception 'booking_forbidden' using errcode = 'P0001';
  end if;

  if v_booking.status not in ('pending', 'approved') then
    raise exception 'booking_not_cancellable' using errcode = 'P0001';
  end if;

  update public.printer_bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;


ALTER FUNCTION "private"."cancel_printer_booking_internal"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."create_printer_booking_internal"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."printer_bookings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_profile public.profiles;
  v_printer public.printers;
  v_ends_at timestamptz;
  v_booking public.printer_bookings;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid() and is_active;

  if not found then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_project_name, ''))) = 0 then
    raise exception 'project_name_required' using errcode = 'P0001';
  end if;

  if p_estimated_duration_minutes is null
     or p_estimated_duration_minutes < 30
     or p_estimated_duration_minutes > 1440
     or p_estimated_duration_minutes % 30 <> 0 then
    raise exception 'invalid_duration' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_starts_at < now() then
    raise exception 'invalid_start_time' using errcode = 'P0001';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => p_estimated_duration_minutes);

  perform pg_advisory_xact_lock(hashtext(p_printer_id::text));

  select * into v_printer
  from public.printers
  where id = p_printer_id;

  if not found or v_printer.status <> 'active' then
    raise exception 'printer_unavailable' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.printer_materials pm
    join public.materials m on m.id = pm.material_id
    where pm.printer_id = p_printer_id
      and pm.material_id = p_material_id
      and m.is_active
  ) then
    raise exception 'incompatible_material' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.printer_bookings b
    where b.printer_id = p_printer_id
      and b.status in ('pending', 'approved', 'in_progress')
      and p_starts_at < b.ends_at
      and v_ends_at > b.starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.maintenance_blocks mb
    where mb.printer_id = p_printer_id
      and p_starts_at < mb.ends_at
      and v_ends_at > mb.starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  insert into public.printer_bookings (
    printer_id,
    profile_id,
    material_id,
    project_name,
    starts_at,
    ends_at,
    estimated_duration_minutes,
    status,
    notes
  )
  values (
    p_printer_id,
    v_profile.id,
    p_material_id,
    btrim(p_project_name),
    p_starts_at,
    v_ends_at,
    p_estimated_duration_minutes,
    'approved',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_booking;

  return v_booking;
end;
$$;


ALTER FUNCTION "private"."create_printer_booking_internal"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."expire_pending_invitations"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  update public.invitations
  set status = 'expired',
      email = null
  where status = 'pending'
    and expires_at <= now();
$$;


ALTER FUNCTION "private"."expire_pending_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_active_profile"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;


ALTER FUNCTION "private"."has_active_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_coordinator"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'coordinator'
      and is_active
  );
$$;


ALTER FUNCTION "private"."is_coordinator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."prevent_profile_role_self_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if old.role <> new.role and not private.is_coordinator() then
    raise exception 'role_change_forbidden' using errcode = 'P0001';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."prevent_profile_role_self_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_lab_identity"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'lab_name_required' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_acronym, ''))) = 0 then
    raise exception 'lab_acronym_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'invalid_timezone' using errcode = 'P0001';
  end if;

  if lower(btrim(coalesce(p_privacy_contact_email, ''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_privacy_contact_email' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "private"."validate_lab_identity"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_printer_booking"("p_booking_id" "uuid") RETURNS "public"."printer_bookings"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
  select private.cancel_printer_booking_internal(p_booking_id);
$$;


ALTER FUNCTION "public"."cancel_printer_booking"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "name" "text",
    "acronym" "text",
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text" NOT NULL,
    "privacy_contact_email" "text",
    "setup_completed_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lab_settings_check" CHECK ((("setup_completed_at" IS NULL) OR (("length"("btrim"(COALESCE("name", ''::"text"))) > 0) AND ("length"("btrim"(COALESCE("acronym", ''::"text"))) > 0) AND ("privacy_contact_email" = "lower"("btrim"("privacy_contact_email"))) AND (POSITION(('@'::"text") IN "privacy_contact_email") > 1)))),
    CONSTRAINT "lab_settings_id_check" CHECK ("id")
);


ALTER TABLE "public"."lab_settings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_lab_installation"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") RETURNS "public"."lab_settings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_catalog'
    AS $$
declare
  v_settings public.lab_settings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  perform private.validate_lab_identity(p_name, p_acronym, p_timezone, p_privacy_contact_email);

  select * into v_settings
  from public.lab_settings
  where id
  for update;

  if v_settings.setup_completed_at is not null then
    raise exception 'installation_already_completed' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set name = btrim(p_name),
      acronym = upper(btrim(p_acronym)),
      timezone = p_timezone,
      privacy_contact_email = lower(btrim(p_privacy_contact_email)),
      setup_completed_at = now(),
      created_by = auth.uid(),
      updated_by = auth.uid()
  where id
  returning * into v_settings;

  return v_settings;
end;
$$;


ALTER FUNCTION "public"."complete_lab_installation"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "printer_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "reason" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "maintenance_blocks_check" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "maintenance_blocks_reason_check" CHECK (("length"("btrim"("reason")) > 0))
);


ALTER TABLE "public"."maintenance_blocks" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_maintenance_block"("p_printer_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."maintenance_blocks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
declare
  v_block public.maintenance_blocks;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at then
    raise exception 'invalid_interval' using errcode = 'P0001';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_printer_id::text));

  if not exists (select 1 from public.printers where id = p_printer_id) then
    raise exception 'printer_not_found' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.printer_bookings
    where printer_id = p_printer_id
      and status in ('pending', 'approved', 'in_progress')
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'booking_conflict' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.maintenance_blocks
    where printer_id = p_printer_id
      and p_starts_at < ends_at
      and p_ends_at > starts_at
  ) then
    raise exception 'maintenance_conflict' using errcode = 'P0001';
  end if;

  insert into public.maintenance_blocks (
    printer_id, created_by, starts_at, ends_at, reason, notes
  ) values (
    p_printer_id, auth.uid(), p_starts_at, p_ends_at, btrim(p_reason),
    nullif(btrim(coalesce(p_notes, '')), '')
  ) returning * into v_block;

  return v_block;
end;
$$;


ALTER FUNCTION "public"."create_maintenance_block"("p_printer_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_printer_booking"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text" DEFAULT NULL::"text") RETURNS "public"."printer_bookings"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
  select private.create_printer_booking_internal(
    p_printer_id,
    p_material_id,
    p_project_name,
    p_starts_at,
    p_estimated_duration_minutes,
    p_notes
  );
$$;


ALTER FUNCTION "public"."create_printer_booking"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'researcher'::"public"."user_role" NOT NULL,
    "academic_affiliation" "public"."academic_affiliation",
    "has_funding_grant" boolean DEFAULT false NOT NULL,
    "funding_agency" "public"."funding_agency",
    "funding_agency_other" "text",
    "weekly_workload_hours" integer,
    "lattes_url" "text",
    "nationality_country_code" character(2),
    "phone" "text",
    "bio" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_email_check" CHECK ((POSITION(('@'::"text") IN ("email")) > 1)),
    CONSTRAINT "profiles_funding_grant_check" CHECK (((NOT "has_funding_grant" AND "funding_agency" IS NULL AND "funding_agency_other" IS NULL) OR ("has_funding_grant" AND "funding_agency" IS NOT NULL AND (("funding_agency" = 'other'::"public"."funding_agency" AND "length"("btrim"(COALESCE("funding_agency_other", ''::"text"))) > 0) OR ("funding_agency" <> 'other'::"public"."funding_agency" AND "funding_agency_other" IS NULL))))),
    CONSTRAINT "profiles_full_name_check" CHECK (("length"("btrim"("full_name")) > 0)),
    CONSTRAINT "profiles_nationality_country_code_check" CHECK ((("nationality_country_code" IS NULL) OR ("nationality_country_code" ~ '^[A-Z]{2}$'::"text"))),
    CONSTRAINT "profiles_weekly_workload_hours_check" CHECK ((("weekly_workload_hours" IS NULL) OR (("weekly_workload_hours" >= 1) AND ("weekly_workload_hours" <= 60))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation" DEFAULT NULL::"public"."academic_affiliation", "p_has_funding_grant" boolean DEFAULT false, "p_funding_agency" "public"."funding_agency" DEFAULT NULL::"public"."funding_agency", "p_funding_agency_other" "text" DEFAULT NULL::"text", "p_weekly_workload_hours" integer DEFAULT NULL::integer, "p_lattes_url" "text" DEFAULT NULL::"text", "p_nationality_country_code" character DEFAULT NULL::"bpchar", "p_phone" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_birth_date" "date" DEFAULT NULL::"date", "p_cpf" "text" DEFAULT NULL::"text", "p_rg" "text" DEFAULT NULL::"text", "p_postal_code" "text" DEFAULT NULL::"text", "p_street" "text" DEFAULT NULL::"text", "p_address_number" "text" DEFAULT NULL::"text", "p_address_complement" "text" DEFAULT NULL::"text", "p_neighborhood" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'private'
    AS $$
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
    has_funding_grant,
    funding_agency,
    funding_agency_other,
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
    p_has_funding_grant,
    case when p_has_funding_grant then p_funding_agency else null end,
    case when p_has_funding_grant and p_funding_agency = 'other' then nullif(btrim(coalesce(p_funding_agency_other, '')), '') else null end,
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


ALTER FUNCTION "public"."create_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_maintenance_block"("p_block_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  delete from public.maintenance_blocks where id = p_block_id;

  if not found then
    raise exception 'maintenance_not_found' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."delete_maintenance_block"("p_block_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."printer_materials" (
    "printer_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."printer_materials" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_printer_materials"("p_printer_id" "uuid", "p_material_ids" "uuid"[]) RETURNS SETOF "public"."printer_materials"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
declare
  v_material_ids uuid[] := coalesce(p_material_ids, '{}'::uuid[]);
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.printers where id = p_printer_id) then
    raise exception 'printer_not_found' using errcode = 'P0001';
  end if;

  if cardinality(v_material_ids) <> (
    select count(distinct material_id)
    from unnest(v_material_ids) as material_id
  ) then
    raise exception 'duplicate_materials' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from unnest(v_material_ids) as requested(material_id)
    left join public.materials m on m.id = requested.material_id and m.is_active
    where m.id is null
  ) then
    raise exception 'invalid_material' using errcode = 'P0001';
  end if;

  delete from public.printer_materials where printer_id = p_printer_id;

  insert into public.printer_materials (printer_id, material_id)
  select p_printer_id, material_id from unnest(v_material_ids) as material_id;

  return query
  select * from public.printer_materials where printer_id = p_printer_id;
end;
$$;


ALTER FUNCTION "public"."replace_printer_materials"("p_printer_id" "uuid", "p_material_ids" "uuid"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "weekday" integer NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    "work_mode" "text" DEFAULT 'onsite'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "availability_slots_check" CHECK (("starts_at" < "ends_at")),
    CONSTRAINT "availability_slots_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6))),
    CONSTRAINT "availability_slots_work_mode_check" CHECK (("work_mode" = ANY (ARRAY['onsite'::"text", 'remote'::"text", 'aula'::"text"])))
);


ALTER TABLE "public"."availability_slots" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_profile_availability"("p_profile_id" "uuid", "p_slots" "jsonb") RETURNS SETOF "public"."availability_slots"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_profile_id <> auth.uid() and not private.is_coordinator() then
    raise exception 'availability_forbidden' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(p_slots, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_slots' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, starts_at time, ends_at time, work_mode text)
    where weekday is null
      or weekday not between 0 and 6
      or starts_at is null
      or ends_at is null
      or starts_at >= ends_at
      or work_mode is null
      or work_mode not in ('onsite', 'remote', 'aula')
  ) then
    raise exception 'invalid_slots' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
      as slot(weekday integer, starts_at time, ends_at time, work_mode text)
  ) <> (
    select count(*)
    from (
      select distinct weekday, starts_at, ends_at
      from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
        as slot(weekday integer, starts_at time, ends_at time, work_mode text)
    ) unique_slots
  ) then
    raise exception 'duplicate_slots' using errcode = 'P0001';
  end if;

  delete from public.availability_slots where profile_id = p_profile_id;

  insert into public.availability_slots (profile_id, weekday, starts_at, ends_at, work_mode)
  select p_profile_id, weekday, starts_at, ends_at, work_mode
  from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
    as slot(weekday integer, starts_at time, ends_at time, work_mode text);

  return query
  select * from public.availability_slots
  where profile_id = p_profile_id
  order by weekday, starts_at;
end;
$$;


ALTER FUNCTION "public"."replace_profile_availability"("p_profile_id" "uuid", "p_slots" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lab_settings"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") RETURNS "public"."lab_settings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_catalog'
    AS $$
declare
  v_settings public.lab_settings;
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  perform private.validate_lab_identity(p_name, p_acronym, p_timezone, p_privacy_contact_email);

  update public.lab_settings
  set name = btrim(p_name),
      acronym = upper(btrim(p_acronym)),
      timezone = p_timezone,
      privacy_contact_email = lower(btrim(p_privacy_contact_email)),
      updated_by = auth.uid()
  where id and setup_completed_at is not null
  returning * into v_settings;

  if not found then
    raise exception 'installation_not_completed' using errcode = 'P0001';
  end if;

  return v_settings;
end;
$$;


ALTER FUNCTION "public"."update_lab_settings"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_lab_identity"() RETURNS TABLE("name" "text", "acronym" "text", "privacy_contact_email" "text", "invitation_ttl_hours" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    lab_settings.name,
    lab_settings.acronym,
    lab_settings.privacy_contact_email,
    72
  from public.lab_settings
  where id and setup_completed_at is not null;
$$;


ALTER FUNCTION "public"."get_public_lab_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_invitation_opened"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'private'
    AS $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  perform private.expire_pending_invitations();

  update public.invitations
  set opened_at = coalesce(opened_at, now())
  where status = 'pending'
    and expires_at > now()
    and auth_user_id = auth.uid()
    and email = v_email;

  if not found then
    raise exception 'valid_invitation_required' using errcode = 'P0001';
  end if;
end;
$$;


ALTER FUNCTION "public"."record_invitation_opened"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."configure_invitation_cleanup"("p_function_url" "text", "p_secret" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'vault', 'cron', 'public', 'pg_catalog'
    AS $$
declare
  v_job_id bigint;
  v_url_secret_id uuid;
  v_auth_secret_id uuid;
begin
  if p_function_url !~ '^https?://' or length(btrim(coalesce(p_secret, ''))) < 16 then
    raise exception 'invalid_cleanup_configuration' using errcode = 'P0001';
  end if;

  select id into v_url_secret_id from vault.secrets where name = 'invitation_cleanup_url';
  if v_url_secret_id is null then
    perform vault.create_secret(p_function_url, 'invitation_cleanup_url', 'Edge Function URL used by invitation cleanup cron');
  else
    perform vault.update_secret(v_url_secret_id, p_function_url);
  end if;

  select id into v_auth_secret_id from vault.secrets where name = 'invitation_cleanup_secret';
  if v_auth_secret_id is null then
    perform vault.create_secret(p_secret, 'invitation_cleanup_secret', 'Bearer secret used only by invitation cleanup cron');
  else
    perform vault.update_secret(v_auth_secret_id, p_secret);
  end if;

  select jobid into v_job_id from cron.job where jobname = 'cleanup-expired-invitations';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'cleanup-expired-invitations',
    '0 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'invitation_cleanup_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'invitation_cleanup_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 10000
      );
    $job$
  );
end;
$$;


ALTER FUNCTION "public"."configure_invitation_cleanup"("p_function_url" "text", "p_secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_my_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation" DEFAULT NULL::"public"."academic_affiliation", "p_has_funding_grant" boolean DEFAULT false, "p_funding_agency" "public"."funding_agency" DEFAULT NULL::"public"."funding_agency", "p_funding_agency_other" "text" DEFAULT NULL::"text", "p_weekly_workload_hours" integer DEFAULT NULL::integer, "p_lattes_url" "text" DEFAULT NULL::"text", "p_nationality_country_code" character DEFAULT NULL::"bpchar", "p_phone" "text" DEFAULT NULL::"text", "p_bio" "text" DEFAULT NULL::"text", "p_birth_date" "date" DEFAULT NULL::"date", "p_cpf" "text" DEFAULT NULL::"text", "p_rg" "text" DEFAULT NULL::"text", "p_postal_code" "text" DEFAULT NULL::"text", "p_street" "text" DEFAULT NULL::"text", "p_address_number" "text" DEFAULT NULL::"text", "p_address_complement" "text" DEFAULT NULL::"text", "p_neighborhood" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_state" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      has_funding_grant = p_has_funding_grant,
      funding_agency = case when p_has_funding_grant then p_funding_agency else null end,
      funding_agency_other = case when p_has_funding_grant and p_funding_agency = 'other' then nullif(btrim(coalesce(p_funding_agency_other, '')), '') else null end,
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


ALTER FUNCTION "public"."update_my_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "role" "public"."user_role" DEFAULT 'researcher'::"public"."user_role" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "auth_user_id" "uuid",
    "accepted_by" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "opened_at" timestamp with time zone,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "send_count" integer DEFAULT 1 NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invitations_check" CHECK ((("expires_at" > "last_sent_at") AND ("last_sent_at" >= "created_at") AND ("send_count" >= 1))),
    CONSTRAINT "invitations_check1" CHECK (((("status" = 'accepted'::"public"."invitation_status") AND ("accepted_by" IS NOT NULL) AND ("accepted_at" IS NOT NULL)) OR (("status" <> 'accepted'::"public"."invitation_status") AND ("accepted_by" IS NULL) AND ("accepted_at" IS NULL)))),
    CONSTRAINT "invitations_email_check" CHECK ((("email" IS NULL) OR (("email" = "lower"("btrim"("email"))) AND (POSITION(('@'::"text") IN ("email")) > 1)))),
    CONSTRAINT "invitations_pending_email_check" CHECK ((("status" <> 'pending'::"public"."invitation_status") OR ("email" IS NOT NULL)))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "materials_name_check" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."printers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "model" "text",
    "location" "text",
    "status" "public"."printer_status" DEFAULT 'active'::"public"."printer_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "printers_name_check" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."printers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_private_data" (
    "profile_id" "uuid" NOT NULL,
    "birth_date" "date",
    "cpf" "text",
    "rg" "text",
    "postal_code" "text",
    "street" "text",
    "address_number" "text",
    "address_complement" "text",
    "neighborhood" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_private_data_cpf_check" CHECK ((("cpf" IS NULL) OR ("cpf" ~ '^[0-9]{11}$'::"text")))
);


ALTER TABLE "public"."profile_private_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_skills" (
    "profile_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profile_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "skills_name_check" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_profile_id_weekday_starts_at_ends_at_key" UNIQUE ("profile_id", "weekday", "starts_at", "ends_at");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_settings"
    ADD CONSTRAINT "lab_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_blocks"
    ADD CONSTRAINT "maintenance_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_no_active_overlap" EXCLUDE USING "gist" ("printer_id" WITH =, "tstzrange"("starts_at", "ends_at", '[)'::"text") WITH &&) WHERE (("status" = ANY (ARRAY['pending'::"public"."booking_status", 'approved'::"public"."booking_status", 'in_progress'::"public"."booking_status"])));



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."printer_materials"
    ADD CONSTRAINT "printer_materials_pkey" PRIMARY KEY ("printer_id", "material_id");



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."printers"
    ADD CONSTRAINT "printers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_private_data"
    ADD CONSTRAINT "profile_private_data_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."profile_skills"
    ADD CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("profile_id", "skill_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



CREATE INDEX "availability_slots_profile_weekday_idx" ON "public"."availability_slots" USING "btree" ("profile_id", "weekday");



CREATE INDEX "availability_slots_weekday_idx" ON "public"."availability_slots" USING "btree" ("weekday", "starts_at", "ends_at");



CREATE INDEX "invitations_expires_at_idx" ON "public"."invitations" USING "btree" ("expires_at");



CREATE INDEX "invitations_invited_by_idx" ON "public"."invitations" USING "btree" ("invited_by");



CREATE UNIQUE INDEX "invitations_one_pending_per_email_idx" ON "public"."invitations" USING "btree" ("email") WHERE ("status" = 'pending'::"public"."invitation_status");



CREATE INDEX "maintenance_blocks_printer_interval_idx" ON "public"."maintenance_blocks" USING "btree" ("printer_id", "starts_at", "ends_at");



CREATE INDEX "printer_bookings_printer_interval_idx" ON "public"."printer_bookings" USING "btree" ("printer_id", "starts_at", "ends_at");



CREATE INDEX "printer_bookings_profile_starts_idx" ON "public"."printer_bookings" USING "btree" ("profile_id", "starts_at");



CREATE INDEX "profiles_is_active_idx" ON "public"."profiles" USING "btree" ("is_active");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "availability_slots_touch_updated_at" BEFORE UPDATE ON "public"."availability_slots" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "invitations_touch_updated_at" BEFORE UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "lab_settings_touch_updated_at" BEFORE UPDATE ON "public"."lab_settings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "maintenance_blocks_touch_updated_at" BEFORE UPDATE ON "public"."maintenance_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "materials_touch_updated_at" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "printer_bookings_touch_updated_at" BEFORE UPDATE ON "public"."printer_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "printers_touch_updated_at" BEFORE UPDATE ON "public"."printers" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "profile_private_data_touch_updated_at" BEFORE UPDATE ON "public"."profile_private_data" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_prevent_role_self_change" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."prevent_profile_role_self_change"();



CREATE OR REPLACE TRIGGER "profiles_touch_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "skills_touch_updated_at" BEFORE UPDATE ON "public"."skills" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."availability_slots"
    ADD CONSTRAINT "availability_slots_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lab_settings"
    ADD CONSTRAINT "lab_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lab_settings"
    ADD CONSTRAINT "lab_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."maintenance_blocks"
    ADD CONSTRAINT "maintenance_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."maintenance_blocks"
    ADD CONSTRAINT "maintenance_blocks_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."printer_bookings"
    ADD CONSTRAINT "printer_bookings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."printer_materials"
    ADD CONSTRAINT "printer_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."printer_materials"
    ADD CONSTRAINT "printer_materials_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "public"."printers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_private_data"
    ADD CONSTRAINT "profile_private_data_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_skills"
    ADD CONSTRAINT "profile_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_skills"
    ADD CONSTRAINT "profile_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



CREATE POLICY "active users can read active profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("private"."has_active_profile"() AND "is_active"));



CREATE POLICY "active users read availability" ON "public"."availability_slots" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read bookings" ON "public"."printer_bookings" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read laboratory settings" ON "public"."lab_settings" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read maintenance" ON "public"."maintenance_blocks" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read materials" ON "public"."materials" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read printer materials" ON "public"."printer_materials" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read printers" ON "public"."printers" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read profile skills" ON "public"."profile_skills" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



CREATE POLICY "active users read skills" ON "public"."skills" FOR SELECT TO "authenticated" USING ("private"."has_active_profile"());



ALTER TABLE "public"."availability_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coordinators manage availability" ON "public"."availability_slots" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators manage materials" ON "public"."materials" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators manage printer materials" ON "public"."printer_materials" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators manage printers" ON "public"."printers" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators manage profiles" ON "public"."profiles" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators manage skills" ON "public"."skills" TO "authenticated" USING ("private"."is_coordinator"()) WITH CHECK ("private"."is_coordinator"());



CREATE POLICY "coordinators read invitations" ON "public"."invitations" FOR SELECT TO "authenticated" USING ("private"."is_coordinator"());



CREATE POLICY "coordinators read private profiles" ON "public"."profile_private_data" FOR SELECT TO "authenticated" USING ("private"."is_coordinator"());



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."printer_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."printer_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."printers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_private_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users manage own availability" ON "public"."availability_slots" TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "users manage own profile skills" ON "public"."profile_skills" TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "users read own private profile" ON "public"."profile_private_data" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" FROM PUBLIC;



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."printer_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."printer_bookings" TO "service_role";



REVOKE ALL ON FUNCTION "private"."cancel_printer_booking_internal"("p_booking_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."create_printer_booking_internal"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."expire_pending_invitations"() FROM PUBLIC;



GRANT ALL ON FUNCTION "private"."has_active_profile"() TO "authenticated";



GRANT ALL ON FUNCTION "private"."is_coordinator"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."validate_lab_identity"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."cancel_printer_booking"("p_booking_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_printer_booking"("p_booking_id" "uuid") TO "authenticated";



GRANT ALL ON TABLE "public"."lab_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."lab_settings" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."complete_lab_installation"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_lab_installation"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_public_lab_identity"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_public_lab_identity"() TO "anon", "authenticated";



REVOKE ALL ON FUNCTION "public"."record_invitation_opened"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."record_invitation_opened"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."configure_invitation_cleanup"("p_function_url" "text", "p_secret" "text") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."configure_invitation_cleanup"("p_function_url" "text", "p_secret" "text") TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."maintenance_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_blocks" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_maintenance_block"("p_printer_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_maintenance_block"("p_printer_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_reason" "text", "p_notes" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_printer_booking"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_printer_booking"("p_printer_id" "uuid", "p_material_id" "uuid", "p_project_name" "text", "p_starts_at" timestamp with time zone, "p_estimated_duration_minutes" integer, "p_notes" "text") TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_maintenance_block"("p_block_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_maintenance_block"("p_block_id" "uuid") TO "authenticated";



GRANT ALL ON TABLE "public"."printer_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."printer_materials" TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_printer_materials"("p_printer_id" "uuid", "p_material_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_printer_materials"("p_printer_id" "uuid", "p_material_ids" "uuid"[]) TO "authenticated";



GRANT ALL ON TABLE "public"."availability_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_slots" TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_profile_availability"("p_profile_id" "uuid", "p_slots" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_profile_availability"("p_profile_id" "uuid", "p_slots" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."touch_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."update_lab_settings"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_lab_settings"("p_name" "text", "p_acronym" "text", "p_timezone" "text", "p_privacy_contact_email" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_my_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_profile"("p_full_name" "text", "p_academic_affiliation" "public"."academic_affiliation", "p_has_funding_grant" boolean, "p_funding_agency" "public"."funding_agency", "p_funding_agency_other" "text", "p_weekly_workload_hours" integer, "p_lattes_url" "text", "p_nationality_country_code" character, "p_phone" "text", "p_bio" "text", "p_birth_date" "date", "p_cpf" "text", "p_rg" "text", "p_postal_code" "text", "p_street" "text", "p_address_number" "text", "p_address_complement" "text", "p_neighborhood" "text", "p_city" "text", "p_state" "text", "p_country" "text") TO "authenticated";



GRANT ALL ON TABLE "public"."invitations" TO "service_role";
GRANT SELECT ON TABLE "public"."invitations" TO "authenticated";



GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."printers" TO "authenticated";
GRANT ALL ON TABLE "public"."printers" TO "service_role";



GRANT ALL ON TABLE "public"."profile_private_data" TO "service_role";
GRANT SELECT ON TABLE "public"."profile_private_data" TO "authenticated";



GRANT ALL ON TABLE "public"."profile_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_skills" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


INSERT INTO "public"."lab_settings" ("id")
VALUES (true)
ON CONFLICT ("id") DO NOTHING;
