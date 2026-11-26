-- Respostas aos comentários: um nível só (responder a uma resposta entra na mesma conversa). O aviso de uma resposta
-- vai para quem participa da conversa (quem escreveu o comentário e quem já respondeu) e para os mencionados, não para
-- todos os envolvidos na tarefa. Apagar o comentário inicial não apaga as respostas dos outros: elas ficam soltas.

alter table public.project_task_comments add column parent_id uuid;
alter table public.project_task_comments
    add constraint project_task_comments_id_task_key unique (id, task_id);
-- A resposta é sempre da mesma tarefa que o comentário respondido.
alter table public.project_task_comments
    add constraint project_task_comments_parent_fkey foreign key (parent_id, task_id)
        references public.project_task_comments (id, task_id) on delete set null (parent_id);
create index project_task_comments_parent_idx on public.project_task_comments (parent_id);

grant insert (parent_id) on table public.project_task_comments to authenticated;

create function private.flatten_task_comment_reply() returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  new.parent_id := coalesce(
    (select parent_id from public.project_task_comments where id = new.parent_id and task_id = new.task_id),
    new.parent_id);
  return new;
end;
$$;
alter function private.flatten_task_comment_reply() owner to postgres;
revoke all on function private.flatten_task_comment_reply() from public;

create trigger project_task_comments_flatten_reply before insert on public.project_task_comments
    for each row when (new.parent_id is not null)
    execute function private.flatten_task_comment_reply();

-- Mesma função de antes; a resposta troca os destinatários e leva "reply" nos dados do aviso.
create or replace function private.notify_task_comment() returns trigger
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
    jsonb_strip_nulls(jsonb_build_object(
      'task', t.title, 'project', p.name, 'by', a.full_name,
      'description', private.plain_excerpt(new.body), 'comment_id', new.id,
      'reply', case when new.parent_id is not null then true end)),
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
          tg_op = 'INSERT' and new.parent_id is null
          and (
            pr.id = v_creator
            or exists (select 1 from public.project_task_assignees s where s.task_id = new.task_id and s.profile_id = pr.id)
            or exists (select 1 from public.project_task_comments c where c.task_id = new.task_id and c.author_id = pr.id)
          )
        )
        or (
          tg_op = 'INSERT' and new.parent_id is not null
          and exists (
            select 1 from public.project_task_comments c
            where c.task_id = new.task_id and (c.id = new.parent_id or c.parent_id = new.parent_id) and c.author_id = pr.id
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
