-- 1. Public bucket for profile photos. Created via migration (not config.toml) so it
--    is also applied when promoting to a remote Supabase project via `supabase db push`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 2. Pointer column on profiles.
alter table "public"."profiles" add column "avatar_url" text;

-- 3. Storage RLS: only the owner may write inside their own folder ("<profile_id>/...").
--    Reads are served publicly by the bucket itself, so no SELECT policy is required.
create policy "users manage own avatar" on storage.objects
    for all to "authenticated"
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Self-service pointer update. Regular researchers have no direct UPDATE access to
--    profiles (only "coordinators manage profiles" allows that), so a dedicated RPC is
--    needed to let anyone point their own profile at their own uploaded object.
create or replace function "public"."set_my_avatar_url"("p_avatar_url" text)
    returns "public"."profiles"
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  update public.profiles
  set avatar_url = nullif(btrim(coalesce(p_avatar_url, '')), '')
  where id = auth.uid()
    and is_active
  returning * into v_profile;

  if not found then
    raise exception 'active_profile_required' using errcode = 'P0001';
  end if;

  return v_profile;
end;
$$;
alter function "public"."set_my_avatar_url"(text) owner to "postgres";
revoke all on function "public"."set_my_avatar_url"(text) from public;
grant all on function "public"."set_my_avatar_url"(text) to "authenticated";
