alter table public.profiles
  add column birth_date date,
  add column is_scholarship_holder boolean not null default false,
  add column weekly_workload_hours integer check (
    weekly_workload_hours is null or weekly_workload_hours between 1 and 60
  ),
  add column lattes_url text,
  add column cpf text,
  add column rg text,
  add column postal_code text,
  add column street text,
  add column address_number text,
  add column address_complement text,
  add column neighborhood text,
  add column city text,
  add column state text,
  add column country text;

alter table public.availability_slots
  add column work_mode text not null default 'onsite',
  add constraint availability_slots_work_mode_check
    check (work_mode in ('onsite', 'remote'));
