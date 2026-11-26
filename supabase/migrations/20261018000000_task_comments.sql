-- Comentários nas tarefas. Quem enxerga o projeto lê e comenta em nome próprio; o autor edita e apaga o seu; o
-- coordenador apaga qualquer um. Avisos (assunto "Tarefas"): quem foi citado recebe "task_mention"; quem criou a
-- tarefa, os responsáveis e quem já comentou recebem "task_comment". Cada pessoa recebe um só; o autor, nunca.

create table public.project_task_comments (
    id uuid default gen_random_uuid() not null,
    task_id uuid not null,
    project_id uuid not null,
    author_id uuid default auth.uid() not null,
    body text not null,
    mentions uuid[] default '{}'::uuid[] not null,
    created_at timestamp with time zone default now() not null,
    edited_at timestamp with time zone,
    constraint project_task_comments_pkey primary key (id),
    -- Trocar a tarefa de projeto leva os comentários junto (on update cascade).
    constraint project_task_comments_task_fkey foreign key (task_id, project_id)
        references public.project_tasks (id, project_id) on delete cascade on update cascade,
    constraint project_task_comments_author_fkey foreign key (author_id)
        references public.profiles (id) on delete cascade,
    constraint project_task_comments_body_check check (body ~ '\S' and length(body) <= 2000),
    constraint project_task_comments_mentions_check check (cardinality(mentions) <= 30)
);
alter table public.project_task_comments owner to postgres;
create index project_task_comments_task_idx on public.project_task_comments (task_id, created_at);

alter table public.project_task_comments enable row level security;
create policy "members and coordinators read task comments" on public.project_task_comments
    for select to authenticated using (private.can_read_project(project_id));
create policy "members and coordinators comment as themselves" on public.project_task_comments
    for insert to authenticated with check (author_id = auth.uid() and private.can_read_project(project_id));
create policy "authors edit their task comments" on public.project_task_comments
    for update to authenticated
    using (author_id = auth.uid() and private.can_read_project(project_id))
    with check (author_id = auth.uid() and private.can_read_project(project_id));
create policy "authors and coordinators delete task comments" on public.project_task_comments
    for delete to authenticated
    using (private.is_coordinator() or (author_id = auth.uid() and private.can_read_project(project_id)));

revoke all on table public.project_task_comments from anon, authenticated;
grant select, delete on table public.project_task_comments to authenticated;
grant insert (task_id, project_id, body, mentions) on table public.project_task_comments to authenticated;
grant update (body, mentions) on table public.project_task_comments to authenticated;
grant all on table public.project_task_comments to service_role;

create function private.mark_task_comment_edited() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.edited_at := now();
  return new;
end;
$$;
alter function private.mark_task_comment_edited() owner to postgres;
revoke all on function private.mark_task_comment_edited() from public;

create trigger project_task_comments_mark_edited before update of body on public.project_task_comments
    for each row when (old.body is distinct from new.body)
    execute function private.mark_task_comment_edited();

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'booking_pending', 'booking_approved', 'booking_rejected', 'booking_cancelled',
    'request_new', 'request_resolved', 'request_status', 'feedback_new', 'purchase_new', 'purchase_status',
    'project_join_request', 'project_join_decision', 'task_assigned', 'task_timer_reminder', 'task_status',
    'task_comment', 'task_mention'
));

-- Ao editar, só quem passou a ser citado agora é avisado. O trecho do comentário vai em "description" e tem
-- prioridade sobre a descrição da tarefa (ver private.enrich_notification).
create function private.notify_task_comment() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_params jsonb;
  v_link text;
  v_creator uuid;
  v_mentioned uuid[] := new.mentions;
  v_recipient record;
begin
  if tg_op = 'UPDATE' then
    v_mentioned := array(select m from unnest(new.mentions) as m where m <> all (old.mentions));
    -- Quem ainda não leu o aviso vê o texto atual, não o anterior.
    update public.notifications
    set params = params || jsonb_build_object('description', private.plain_excerpt(new.body))
    where entity_id = new.task_id and read_at is null
      and type in ('task_comment', 'task_mention') and params->>'comment_id' = new.id::text;
  end if;

  select
    jsonb_build_object(
      'task', t.title, 'project', p.name, 'by', a.full_name,
      'description', private.plain_excerpt(new.body), 'comment_id', new.id),
    '/projetos/' || t.project_id || '?tarefa=' || t.id,
    t.created_by
  into v_params, v_link, v_creator
  from public.project_tasks t
  join public.projects p on p.id = t.project_id
  join public.profiles a on a.id = new.author_id
  where t.id = new.task_id;

  -- Só quem ainda enxerga o projeto é avisado.
  for v_recipient in
    select pr.id, pr.id = any (v_mentioned) as mentioned
    from public.profiles pr
    where pr.is_active
      and pr.id <> new.author_id
      and (
        pr.role = 'coordinator'
        or exists (select 1 from public.project_members m where m.project_id = new.project_id and m.profile_id = pr.id)
      )
      and (
        pr.id = any (v_mentioned)
        or (
          tg_op = 'INSERT'
          and (
            pr.id = v_creator
            or exists (select 1 from public.project_task_assignees s where s.task_id = new.task_id and s.profile_id = pr.id)
            or exists (select 1 from public.project_task_comments c where c.task_id = new.task_id and c.author_id = pr.id)
          )
        )
      )
  loop
    perform private.notify(
      v_recipient.id,
      case when v_recipient.mentioned then 'task_mention' else 'task_comment' end,
      v_params, v_link, new.task_id
    );
  end loop;

  return new;
end;
$$;
alter function private.notify_task_comment() owner to postgres;
revoke all on function private.notify_task_comment() from public;

create trigger project_task_comments_notify after insert on public.project_task_comments
    for each row execute function private.notify_task_comment();
create trigger project_task_comments_notify_edit after update of body, mentions on public.project_task_comments
    for each row when (old.body is distinct from new.body or old.mentions is distinct from new.mentions)
    execute function private.notify_task_comment();

-- Comentário apagado: os avisos dele deixam de ser novidade e perdem o trecho do texto.
create function private.resolve_comment_notifications() returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now()), params = params - 'description'
  where entity_id = old.task_id and type in ('task_comment', 'task_mention') and params->>'comment_id' = old.id::text;
  return old;
end;
$$;
alter function private.resolve_comment_notifications() owner to postgres;
revoke all on function private.resolve_comment_notifications() from public;

create trigger project_task_comments_resolve_notifications after delete on public.project_task_comments
    for each row execute function private.resolve_comment_notifications();

-- Apagar a tarefa baixa também os avisos de comentário; concluir ou arquivar não (eles saem quando lidos).
create or replace function private.resolve_task_notifications() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if tg_op = 'DELETE' then
    perform private.resolve_notifications(
      old.id, array['task_assigned', 'task_timer_reminder', 'task_status', 'task_comment', 'task_mention']);
    return old;
  end if;

  update public.notifications set read_at = now()
  where entity_id = new.id and read_at is null
    and type in ('task_assigned', 'task_timer_reminder', 'task_status')
    and not (type = 'task_status' and params->>'status' = 'done');
  return new;
end;
$$;

alter publication supabase_realtime add table public.project_task_comments;
