alter table public.availability_slots
  drop constraint availability_slots_work_mode_check;

alter table public.availability_slots
  add constraint availability_slots_work_mode_check
    check (work_mode in ('onsite', 'remote', 'aula'));
