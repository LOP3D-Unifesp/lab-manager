-- Avisos com mais detalhes: ao criar uma notificação, os dados do assunto (descrição, prazo, quem pediu, valor,
-- horário...) entram em `params`, de onde saem o aviso no computador e o push. Um único gatilho, antes da inclusão,
-- para não repetir isso em cada gatilho de aviso. O que o gatilho de origem já mandou tem prioridade.
-- Quem recebe cada aviso já pode ler o assunto no app.

-- Texto curto e sem a marcação das descrições (negrito, itálico, código, links e marcadores de lista).
create function private.plain_excerpt(p_text text, p_max integer default 140) returns text
language sql
immutable
set search_path = ''
as $$
  with cleaned as (
    select btrim(regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(coalesce(p_text, ''), '\[([^\]]+)\]\(https?://[^)]*\)', '\1', 'g'),
            '\*\*(.+?)\*\*', '\1', 'g'),
          '\*([^*\n]+?)\*|`([^`\n]+?)`', '\1\2', 'g'),
        '(^|\n)[ \t]*([-*•]|\d+[.)])[ \t]+', '\1', 'g'),
      '\s+', ' ', 'g')) as value
  )
  select case
    when value = '' then null
    when length(value) > p_max then rtrim(left(value, p_max - 1)) || '…'
    else value
  end
  from cleaned;
$$;
alter function private.plain_excerpt(text, integer) owner to postgres;
revoke all on function private.plain_excerpt(text, integer) from public;

create function private.enrich_notification() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  v_extra jsonb;
begin
  if new.entity_id is not null then
    if new.type like 'task\_%' then
      select jsonb_build_object('description', private.plain_excerpt(t.description), 'due_on', t.due_on, 'priority', t.priority)
      into v_extra
      from public.project_tasks t where t.id = new.entity_id;
    elsif new.type like 'request\_%' then
      select jsonb_build_object(
        'description', private.plain_excerpt(r.description), 'author', p.full_name,
        'solution', private.plain_excerpt(r.resolution_notes))
      into v_extra
      from public.maintenance_requests r left join public.profiles p on p.id = r.requested_by
      where r.id = new.entity_id;
    elsif new.type like 'purchase\_%' then
      select jsonb_build_object(
        'quantity', q.quantity, 'amount', coalesce(q.actual_amount, q.estimated_amount),
        'project', pr.name, 'stock', case when q.project_id is null then true end,
        'author', p.full_name, 'description', private.plain_excerpt(q.notes))
      into v_extra
      from public.purchase_requests q
      left join public.projects pr on pr.id = q.project_id
      left join public.profiles p on p.id = q.requested_by
      where q.id = new.entity_id;
    elsif new.type like 'booking\_%' then
      select jsonb_build_object(
        'starts_at', b.starts_at, 'ends_at', b.ends_at, 'author', p.full_name,
        'timezone', (select s.timezone from public.lab_settings s where s.id))
      into v_extra
      from public.equipment_bookings b left join public.profiles p on p.id = b.profile_id
      where b.id = new.entity_id;
    elsif new.type = 'project_join_request' then
      select jsonb_build_object('description', private.plain_excerpt(j.message))
      into v_extra
      from public.project_join_requests j where j.id = new.entity_id;
    elsif new.type = 'feedback_new' then
      select jsonb_build_object('description', private.plain_excerpt(f.message), 'author', p.full_name)
      into v_extra
      from public.feedback_reports f left join public.profiles p on p.id = f.created_by
      where f.id = new.entity_id;
    end if;
  end if;

  v_extra := coalesce(v_extra, '{}'::jsonb)
    || jsonb_build_object('by', (select full_name from public.profiles where id = auth.uid()));
  new.params := jsonb_strip_nulls(v_extra) || coalesce(new.params, '{}'::jsonb);
  return new;
end;
$$;
alter function private.enrich_notification() owner to postgres;
revoke all on function private.enrich_notification() from public;

create trigger notifications_enrich before insert on public.notifications
    for each row execute function private.enrich_notification();
