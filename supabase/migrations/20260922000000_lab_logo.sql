-- Logo do laboratório, enviado por coordenadores em Configurações. Há duas versões: para o tema claro e para o escuro
-- (se faltar a versão escura, a tela usa a clara). Sem logo enviado, o app mostra a marca provisória.

alter table public.lab_settings
    add column if not exists logo_light_url text,
    add column if not exists logo_dark_url text;

-- Bucket público (o login precisa exibir o logo antes de qualquer sessão). Só coordenadores escrevem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lab-logo', 'lab-logo', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "coordinators manage lab logo" on storage.objects
    for all to authenticated
    using (bucket_id = 'lab-logo' and private.is_coordinator())
    with check (bucket_id = 'lab-logo' and private.is_coordinator());

-- Apontar o logo de uma versão ('light' ou 'dark'); NULL ou vazio remove.
create or replace function public.set_lab_logo(p_variant text, p_url text)
    returns public.lab_settings
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_settings public.lab_settings;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if not private.is_coordinator() then
    raise exception 'coordinator_required' using errcode = 'P0001';
  end if;

  if p_variant not in ('light', 'dark') then
    raise exception 'invalid_logo_variant' using errcode = 'P0001';
  end if;

  if v_url is not null and v_url !~ '^https?://' then
    raise exception 'invalid_logo_url' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set logo_light_url = case when p_variant = 'light' then v_url else logo_light_url end,
      logo_dark_url = case when p_variant = 'dark' then v_url else logo_dark_url end,
      updated_by = auth.uid()
  where id
  returning * into v_settings;

  return v_settings;
end;
$$;
alter function public.set_lab_logo(text, text) owner to postgres;
revoke all on function public.set_lab_logo(text, text) from public;
grant execute on function public.set_lab_logo(text, text) to authenticated;

-- A identidade pública passa a trazer o logo. Muda o tipo de retorno, então a função é recriada.
drop function if exists public.get_public_lab_identity();
create function public.get_public_lab_identity()
    returns table (
        name text,
        acronym text,
        privacy_contact_email text,
        invitation_ttl_hours integer,
        logo_light_url text,
        logo_dark_url text
    )
    language sql stable security definer
    set search_path to 'public'
    as $$
  select
    lab_settings.name,
    lab_settings.acronym,
    lab_settings.privacy_contact_email,
    72,
    lab_settings.logo_light_url,
    lab_settings.logo_dark_url
  from public.lab_settings
  where id and setup_completed_at is not null;
$$;
alter function public.get_public_lab_identity() owner to postgres;
revoke all on function public.get_public_lab_identity() from public, anon, authenticated;
grant execute on function public.get_public_lab_identity() to anon, authenticated;
