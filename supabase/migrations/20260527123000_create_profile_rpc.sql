create or replace function public.create_profile(
  p_full_name text,
  p_email text,
  p_academic_affiliation public.academic_affiliation default null,
  p_birth_date date default null,
  p_is_scholarship_holder boolean default false,
  p_weekly_workload_hours integer default null,
  p_lattes_url text default null,
  p_cpf text default null,
  p_rg text default null,
  p_postal_code text default null,
  p_street text default null,
  p_address_number text default null,
  p_address_complement text default null,
  p_neighborhood text default null,
  p_city text default null,
  p_state text default null,
  p_country text default null,
  p_nationality_country_code char(2) default null,
  p_phone text default null,
  p_bio text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    academic_affiliation,
    birth_date,
    is_scholarship_holder,
    weekly_workload_hours,
    lattes_url,
    cpf,
    rg,
    postal_code,
    street,
    address_number,
    address_complement,
    neighborhood,
    city,
    state,
    country,
    nationality_country_code,
    phone,
    bio,
    is_active
  ) values (
    auth.uid(),
    p_full_name,
    p_email,
    'researcher',
    p_academic_affiliation,
    p_birth_date,
    p_is_scholarship_holder,
    p_weekly_workload_hours,
    p_lattes_url,
    p_cpf,
    p_rg,
    p_postal_code,
    p_street,
    p_address_number,
    p_address_complement,
    p_neighborhood,
    p_city,
    p_state,
    p_country,
    p_nationality_country_code,
    p_phone,
    p_bio,
    true
  ) returning * into v_profile;

  return v_profile;
end;
$$;

grant execute on function public.create_profile(
  text,
  text,
  public.academic_affiliation,
  date,
  boolean,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  char(2),
  text,
  text
) to authenticated;
