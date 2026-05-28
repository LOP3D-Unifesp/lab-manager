drop policy if exists "users can insert own profile" on public.profiles;

create policy "users can insert own profile"
on public.profiles for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'researcher'
  and is_active
);
