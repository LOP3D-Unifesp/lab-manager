create policy "coordinators manage availability"
on public.availability_slots for all
to authenticated
using (public.is_coordinator())
with check (public.is_coordinator());
