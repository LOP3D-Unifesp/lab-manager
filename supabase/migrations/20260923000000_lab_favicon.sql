-- Ícone da aba (favicon) próprio do laboratório. Deve ser quadrado; sem ele, o app usa o logo claro.

alter table public.lab_settings
    add column if not exists favicon_url text;

-- A função de salvar passa a aceitar a terceira variante ('favicon'). O tipo de retorno é o mesmo, então basta substituir.
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

  if p_variant not in ('light', 'dark', 'favicon') then
    raise exception 'invalid_logo_variant' using errcode = 'P0001';
  end if;

  if v_url is not null and v_url !~ '^https?://' then
    raise exception 'invalid_logo_url' using errcode = 'P0001';
  end if;

  update public.lab_settings
  set logo_light_url = case when p_variant = 'light' then v_url else logo_light_url end,
      logo_dark_url = case when p_variant = 'dark' then v_url else logo_dark_url end,
      favicon_url = case when p_variant = 'favicon' then v_url else favicon_url end,
      updated_by = auth.uid()
  where id
  returning * into v_settings;

  return v_settings;
end;
$$;

-- A identidade pública traz também o favicon (as telas sem login trocam o ícone da aba). Muda o retorno: recriar.
drop function if exists public.get_public_lab_identity();
create function public.get_public_lab_identity()
    returns table (
        name text,
        acronym text,
        privacy_contact_email text,
        invitation_ttl_hours integer,
        logo_light_url text,
        logo_dark_url text,
        favicon_url text
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
    lab_settings.logo_dark_url,
    lab_settings.favicon_url
  from public.lab_settings
  where id and setup_completed_at is not null;
$$;
alter function public.get_public_lab_identity() owner to postgres;
revoke all on function public.get_public_lab_identity() from public, anon, authenticated;
grant execute on function public.get_public_lab_identity() to anon, authenticated;
