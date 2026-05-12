drop policy if exists "users can update own non-role profile" on public.profiles;
drop policy if exists "users manage own profile skills" on public.profile_skills;
drop policy if exists "users manage own availability" on public.availability_slots;

create policy "users can update own non-role profile"
on public.profiles for update
to authenticated
using (id = auth.uid() and is_active)
with check (id = auth.uid());

create policy "users manage own profile skills"
on public.profile_skills for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "users manage own availability"
on public.availability_slots for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
