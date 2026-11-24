-- Avisos com o app fechado (Web Push): cada navegador que ligou os avisos guarda uma assinatura aqui,
-- e cada notificação nova dispara a Edge Function `send-push`, que entrega o aviso a essas assinaturas.

create table public.push_subscriptions (
    id uuid default gen_random_uuid() not null,
    profile_id uuid not null,
    endpoint text not null,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamp with time zone default now() not null,
    constraint push_subscriptions_pkey primary key (id),
    constraint push_subscriptions_endpoint_key unique (endpoint),
    constraint push_subscriptions_profile_id_fkey foreign key (profile_id) references public.profiles (id) on delete cascade,
    constraint push_subscriptions_endpoint_check check (length(endpoint) between 10 and 2000 and endpoint like 'https://%'),
    constraint push_subscriptions_keys_check check (length(p256dh) between 10 and 300 and length(auth) between 10 and 100),
    constraint push_subscriptions_user_agent_check check (user_agent is null or length(user_agent) <= 500)
);
alter table public.push_subscriptions owner to postgres;
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

-- Cada pessoa vê e remove só as próprias assinaturas. Criar e reatribuir passa pela função abaixo.
create policy "users read own push subscriptions" on public.push_subscriptions
    for select to authenticated using (profile_id = auth.uid());
create policy "users delete own push subscriptions" on public.push_subscriptions
    for delete to authenticated using (profile_id = auth.uid());

grant select, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

-- Registra (ou passa para a pessoa logada) a assinatura deste navegador. O endpoint é único: se outra pessoa
-- entrar no mesmo navegador, a assinatura muda de dono em vez de continuar entregando avisos da anterior.
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
begin
  if auth.uid() is null or not private.has_active_profile() then
    raise exception 'active profile required' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 500))
  on conflict (endpoint) do update
    set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end;
$$;
alter function public.register_push_subscription(text, text, text, text) owner to postgres;
revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

-- Onde chamar a Edge Function. Fica numa tabela (e não na migration) porque muda por ambiente e inclui um segredo:
-- sem a linha (como no banco local e na CI) nenhum push é enviado. Só o dono do banco lê e escreve.
create extension if not exists pg_net with schema extensions;

create table private.push_config (
    id boolean default true not null primary key check (id),
    function_url text not null check (function_url like 'https://%' or function_url like 'http://%'),
    secret text not null check (length(secret) >= 24)
);
alter table private.push_config owner to postgres;
revoke all on table private.push_config from public, anon, authenticated;

-- Depois de criar a notificação, pede o envio do push. Nunca atrapalha quem gerou o evento: qualquer erro aqui é ignorado.
create function private.send_push_for_notification() returns trigger
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
alter function private.send_push_for_notification() owner to postgres;

create trigger notifications_send_push
    after insert on public.notifications
    for each row execute function private.send_push_for_notification();
