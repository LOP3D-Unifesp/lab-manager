-- Prioridade das tarefas dos projetos, com os mesmos três níveis dos chamados de manutenção e dos pedidos de compra.
-- Só informa e filtra: a ordem das tarefas dentro de cada coluna continua sendo a manual (`position`).

create type public.task_priority as enum ('low', 'normal', 'urgent');
alter type public.task_priority owner to postgres;

alter table public.project_tasks
    add column priority public.task_priority not null default 'normal';
