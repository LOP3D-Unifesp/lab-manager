-- Preferências de notificação: cada pessoa escolhe, por assunto, se quer ver no painel e se quer aviso no computador (push).
-- Sem linha para um assunto, vale o padrão: tudo ligado.
-- O push parte da notificação guardada: com `in_app` desligado a notificação nem é criada, então o aviso no computador
-- também não chega (a tela desabilita essa opção nesse caso).

create table public.notification_preferences (
    profile_id uuid not null,
    topic text not null,
    in_app boolean default true not null,
    push boolean default true not null,
    updated_at timestamp with time zone default now() not null,
    constraint notification_preferences_pkey primary key (profile_id, topic),
    constraint notification_preferences_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete cascade,
    constraint notification_preferences_topic_check check (topic in ('bookings', 'requests', 'purchases', 'feedback'))
);
alter table public.notification_preferences owner to postgres;
create trigger notification_preferences_touch_updated_at before update on public.notification_preferences
    for each row execute function public.touch_updated_at();

alter table public.notification_preferences enable row level security;
create policy "users read own notification preferences" on public.notification_preferences
    for select to authenticated using (profile_id = auth.uid());
create policy "users add own notification preferences" on public.notification_preferences
    for insert to authenticated with check (profile_id = auth.uid() and private.has_active_profile());
create policy "users change own notification preferences" on public.notification_preferences
    for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select, insert on table public.notification_preferences to authenticated;
grant update (in_app, push) on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;

-- Assunto (agrupamento da tela) de cada tipo de notificação.
create function private.notification_topic(p_type text) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type like 'booking\_%' then 'bookings'
    when p_type like 'request\_%' then 'requests'
    when p_type like 'purchase\_%' then 'purchases'
    when p_type like 'feedback\_%' then 'feedback'
  end;
$$;
alter function private.notification_topic(text) owner to postgres;
revoke all on function private.notification_topic(text) from public;

-- A pessoa quer receber este tipo neste canal? ('in_app' ou 'push'). Sem preferência salva, quer.
create function private.wants_notification(p_profile uuid, p_type text, p_channel text) returns boolean
language sql
stable
security definer
set search_path = 'public', 'private'
as $$
  select coalesce(
    (select case when p_channel = 'push' then push else in_app end
     from public.notification_preferences
     where profile_id = p_profile and topic = private.notification_topic(p_type)),
    true
  );
$$;
alter function private.wants_notification(uuid, text, text) owner to postgres;
revoke all on function private.wants_notification(uuid, text, text) from public;

-- Mesma função da migration das notificações, agora respeitando "ver no painel".
create or replace function private.notify(p_recipient uuid, p_type text, p_params jsonb, p_link text, p_entity uuid) returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if p_recipient is null or p_recipient is not distinct from auth.uid() then
    return;
  end if;

  if not exists (select 1 from public.profiles where id = p_recipient and is_active) then
    return;
  end if;

  if not private.wants_notification(p_recipient, p_type, 'in_app') then
    return;
  end if;

  delete from public.notifications
  where recipient_id = p_recipient and read_at is not null and read_at < now() - interval '90 days';

  insert into public.notifications (recipient_id, type, params, link, entity_id)
  values (p_recipient, p_type, coalesce(p_params, '{}'::jsonb), p_link, p_entity);
end;
$$;

-- Mesma função da migration do push, agora respeitando "aviso no computador".
create or replace function private.send_push_for_notification() returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions'
as $$
declare
  v_config private.push_config;
begin
  select * into v_config from private.push_config;
  if not found then
    return new;
  end if;

  if not private.wants_notification(new.recipient_id, new.type, 'push') then
    return new;
  end if;

  if not exists (select 1 from public.push_subscriptions where profile_id = new.recipient_id) then
    return new;
  end if;

  begin
    perform net.http_post(
      url := v_config.function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_config.secret),
      body := jsonb_build_object(
        'recipient_id', new.recipient_id,
        'type', new.type,
        'params', new.params,
        'link', new.link,
        'id', new.id
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;
