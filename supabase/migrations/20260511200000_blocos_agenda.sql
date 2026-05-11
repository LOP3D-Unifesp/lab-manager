-- Limpa slots existentes (dados de dev)
truncate table public.availability_slots;

-- Atualiza constraint do campo periodo
alter table public.availability_slots
  drop constraint if exists availability_slots_periodo_check;

alter table public.availability_slots
  add constraint availability_slots_periodo_check
    check (periodo in ('b1', 'b2', 'b3', 'b4'));
