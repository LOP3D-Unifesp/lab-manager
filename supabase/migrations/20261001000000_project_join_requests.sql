-- Pesquisadores veem o resumo de todos os projetos (nome, descrição, status, datas e quem participa) e pedem para
-- entrar. Coordenadores e membros do projeto aprovam ou recusam. Tarefas, financiamento e compras continuam só para
-- membros e coordenadores: o resumo vem de funções próprias, sem abrir as tabelas `projects` e `project_members`.

create type public.project_join_status as enum ('pending', 'approved', 'rejected', 'cancelled');
alter type public.project_join_status owner to postgres;

create table public.project_join_requests (
    id uuid default gen_random_uuid() not null,
    project_id uuid not null,
    profile_id uuid not null,
    message text,
    status public.project_join_status default 'pending' not null,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    constraint project_join_requests_pkey primary key (id),
    constraint project_join_requests_project_id_fkey foreign key (project_id) references public.projects (id) on delete cascade,
    constraint project_join_requests_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete cascade,
    constraint project_join_requests_decided_by_fkey foreign key (decided_by) references public.profiles (id) on delete set null,
    constraint project_join_requests_message_check check (message is null or length(message) <= 300)
);
alter table public.project_join_requests owner to postgres;
create unique index project_join_requests_one_pending_idx on public.project_join_requests (project_id, profile_id) where status = 'pending';
create index project_join_requests_project_idx on public.project_join_requests (project_id, status);
create index project_join_requests_profile_idx on public.project_join_requests (profile_id);

alter table public.project_join_requests enable row level security;
-- Quem pediu lê o próprio pedido; membros e coordenadores leem os pedidos do projeto. Escrever só pelas funções abaixo.
create policy "requesters members and coordinators read join requests" on public.project_join_requests
    for select to authenticated using (profile_id = auth.uid() or private.can_read_project(project_id));
grant select on table public.project_join_requests to authenticated;
grant all on table public.project_join_requests to service_role;

-- Pede para entrar num projeto aberto do qual a pessoa ainda não participa.
create function public.request_project_join(p_project_id uuid, p_message text default null) returns uuid
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_status public.project_status;
  v_id uuid;
begin
  if auth.uid() is null or not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select status into v_status from public.projects where id = p_project_id;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;
  if v_status not in ('planning', 'active', 'paused') then
    raise exception 'project_closed' using errcode = 'P0001';
  end if;
  if private.is_project_member(p_project_id) or private.is_coordinator() then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  begin
    insert into public.project_join_requests (project_id, profile_id, message)
    values (p_project_id, auth.uid(), nullif(btrim(coalesce(p_message, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'request_already_pending' using errcode = 'P0001';
  end;

  return v_id;
end;
$$;
alter function public.request_project_join(uuid, text) owner to postgres;
revoke all on function public.request_project_join(uuid, text) from public, anon;
grant execute on function public.request_project_join(uuid, text) to authenticated;

-- Quem pediu cancela o próprio pedido, enquanto ainda está pendente.
create function public.cancel_project_join_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  update public.project_join_requests
  set status = 'cancelled', decided_at = now()
  where id = p_request_id and profile_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
end;
$$;
alter function public.cancel_project_join_request(uuid) owner to postgres;
revoke all on function public.cancel_project_join_request(uuid) from public, anon;
grant execute on function public.cancel_project_join_request(uuid) to authenticated;

-- Coordenador ou membro do projeto aprova (a pessoa entra no projeto) ou recusa um pedido pendente.
create function public.decide_project_join_request(p_request_id uuid, p_approve boolean) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_request public.project_join_requests;
begin
  if auth.uid() is null or not private.has_active_profile() then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  select * into v_request from public.project_join_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'request_not_found' using errcode = 'P0001';
  end if;
  if not private.can_read_project(v_request.project_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_request.profile_id = auth.uid() then
    raise exception 'own_request' using errcode = 'P0001';
  end if;

  update public.project_join_requests
  set status = case when p_approve then 'approved'::public.project_join_status else 'rejected'::public.project_join_status end,
      decided_by = auth.uid(),
      decided_at = now()
  where id = p_request_id;

  if p_approve then
    insert into public.project_members (project_id, profile_id, added_by)
    values (v_request.project_id, v_request.profile_id, auth.uid())
    on conflict (project_id, profile_id) do nothing;
  end if;
end;
$$;
alter function public.decide_project_join_request(uuid, boolean) owner to postgres;
revoke all on function public.decide_project_join_request(uuid, boolean) from public, anon;
grant execute on function public.decide_project_join_request(uuid, boolean) to authenticated;

-- Resumo dos projetos para qualquer pessoa ativa (sem financiamento, tarefas nem compras). Com `p_project_id`, só aquele.
-- `pending_count` (pedidos de entrada pendentes) só vem para quem pode decidir.
create function public.list_project_directory(p_project_id uuid default null)
returns table (
    id uuid,
    name text,
    description text,
    status public.project_status,
    starts_on date,
    ends_on date,
    members jsonb,
    is_member boolean,
    my_request_id uuid,
    my_request_status public.project_join_status,
    pending_count integer
)
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select
    p.id,
    p.name,
    p.description,
    p.status,
    p.starts_on,
    p.ends_on,
    coalesce((
      select jsonb_agg(jsonb_build_object('profile_id', m.profile_id, 'full_name', pr.full_name, 'avatar_url', pr.avatar_url) order by pr.full_name)
      from public.project_members m
      join public.profiles pr on pr.id = m.profile_id and pr.is_active
      where m.project_id = p.id
    ), '[]'::jsonb) as members,
    private.is_project_member(p.id) as is_member,
    (select r.id from public.project_join_requests r where r.project_id = p.id and r.profile_id = auth.uid() and r.status = 'pending') as my_request_id,
    (select r.status from public.project_join_requests r where r.project_id = p.id and r.profile_id = auth.uid() and r.status = 'pending') as my_request_status,
    case when private.can_read_project(p.id)
      then (select count(*)::int from public.project_join_requests r where r.project_id = p.id and r.status = 'pending')
      else 0
    end as pending_count
  from public.projects p
  where private.has_active_profile()
    and (p_project_id is null or p.id = p_project_id)
  order by p.name;
$$;
alter function public.list_project_directory(uuid) owner to postgres;
revoke all on function public.list_project_directory(uuid) from public, anon;
grant execute on function public.list_project_directory(uuid) to authenticated;

-- Notificações: o pedido avisa os coordenadores e os membros do projeto; a decisão avisa quem pediu.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status',
    'project_join_request', 'project_join_decision'
));

alter table public.notification_preferences drop constraint notification_preferences_topic_check;
alter table public.notification_preferences add constraint notification_preferences_topic_check
    check (topic in ('bookings', 'requests', 'purchases', 'feedback', 'projects'));

create or replace function private.notification_topic(p_type text) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type like 'booking\_%' then 'bookings'
    when p_type like 'request\_%' then 'requests'
    when p_type like 'purchase\_%' then 'purchases'
    when p_type like 'feedback\_%' then 'feedback'
    when p_type like 'project\_%' then 'projects'
  end;
$$;

create function private.notify_project_join_change() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_project text;
  v_requester text;
  v_params jsonb;
  v_id uuid;
begin
  select name into v_project from public.projects where id = new.project_id;

  if tg_op = 'INSERT' then
    select full_name into v_requester from public.profiles where id = new.profile_id;
    v_params := jsonb_build_object('project', v_project, 'requester', v_requester, 'message', new.message);
    for v_id in
      select pr.id from public.profiles pr
      where pr.is_active
        and (pr.role = 'coordinator' or exists (select 1 from public.project_members m where m.project_id = new.project_id and m.profile_id = pr.id))
    loop
      perform private.notify(v_id, 'project_join_request', v_params, '/projetos/' || new.project_id, new.id);
    end loop;
  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform private.notify(
      new.profile_id, 'project_join_decision',
      jsonb_build_object('project', v_project, 'approved', new.status = 'approved'),
      '/projetos/' || new.project_id, new.id
    );
  end if;

  return new;
end;
$$;
alter function private.notify_project_join_change() owner to postgres;

create trigger project_join_requests_notify
    after insert or update of status on public.project_join_requests
    for each row execute function private.notify_project_join_change();
