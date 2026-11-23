-- A purchase request can be for the lab general stock instead of a project (project_id null), like the items of
-- the inventory. Anyone active can request for the general stock; only the author and the coordinator see it
-- (project members see the requests of their project).

alter table public.purchase_requests alter column project_id drop not null;

create or replace function private.can_request_purchase(p_project_id uuid) returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select private.has_active_profile()
    and (
      p_project_id is null
      or (
        exists (select 1 from public.projects where id = p_project_id and status in ('planning', 'active', 'paused'))
        and (private.is_coordinator() or private.is_project_member(p_project_id))
      )
    );
$$;
