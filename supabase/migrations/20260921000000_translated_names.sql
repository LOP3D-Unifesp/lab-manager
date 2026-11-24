-- Nomes traduzidos (opcionais) para dados de catálogo que aparecem na tela:
-- tipos de equipamento e habilidades. Se a tradução estiver vazia, a tela usa o nome original (`name`).

alter table public.equipment_types
  add column if not exists name_en text,
  add column if not exists name_es text;

alter table public.skills
  add column if not exists name_en text,
  add column if not exists name_es text;

-- Traduções dos tipos que já vêm cadastrados por padrão.
update public.equipment_types set name_en = '3D printer', name_es = 'Impresora 3D' where name = 'Impressora 3D' and name_en is null;
update public.equipment_types set name_en = '3D scanner', name_es = 'Escáner 3D' where name = 'Scanner 3D' and name_en is null;
update public.equipment_types set name_en = 'Laser cutter', name_es = 'Cortadora láser' where name = 'Cortadora a laser' and name_en is null;
update public.equipment_types set name_en = 'Workbench and tools', name_es = 'Banco de trabajo y herramientas' where name = 'Bancada e ferramentas' and name_en is null;
update public.equipment_types set name_en = 'Computer', name_es = 'Computadora' where name = 'Computador' and name_en is null;
