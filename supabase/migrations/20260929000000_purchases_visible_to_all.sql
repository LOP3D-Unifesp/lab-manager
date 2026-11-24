-- Os pedidos de compra passam a ser visíveis para todos os usuários ativos (antes: só quem pediu, os membros do projeto
-- e os coordenadores), como já acontece com os chamados de manutenção. Só a leitura muda: pedir, editar, cancelar e
-- decidir continuam restritos pelas regras de insert e pelas funções (`update_purchase_request`, `set_purchase_status`).

drop policy "authors members and coordinators read purchases" on public.purchase_requests;
create policy "active users read purchases" on public.purchase_requests
    for select to authenticated using (private.has_active_profile());

-- Quem não é do projeto não lê a tabela `projects`, então o nome do projeto de um pedido alheio vem daqui.
-- Só devolve projetos que têm pedido de compra, para não virar uma lista de todos os projetos.
create function public.get_purchase_project_names(p_project_ids uuid[]) returns table (id uuid, name text)
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select p.id, p.name
  from public.projects p
  where private.has_active_profile()
    and p.id = any(p_project_ids)
    and exists (select 1 from public.purchase_requests pr where pr.project_id = p.id);
$$;
alter function public.get_purchase_project_names(uuid[]) owner to postgres;
revoke all on function public.get_purchase_project_names(uuid[]) from public, anon;
grant execute on function public.get_purchase_project_names(uuid[]) to authenticated;
