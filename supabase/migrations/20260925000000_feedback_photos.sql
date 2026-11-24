-- Fotos (até 3) em mensagens de feedback, como nos chamados de manutenção.
-- Ao contrário do bucket dos chamados (que qualquer perfil ativo lê), as fotos de feedback só são lidas por quem enviou
-- e pelos coordenadores, porque podem mostrar telas com dados pessoais.

alter table public.feedback_reports
    add column photo_paths text[] not null default '{}',
    add constraint feedback_reports_photo_paths_check check (cardinality(photo_paths) <= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-photos', 'feedback-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Uma pasta por autor: "<profile_id>/<arquivo>".
create policy "users upload own feedback photos" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'feedback-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
        and private.has_active_profile()
    );

create policy "authors and coordinators read feedback photos" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'feedback-photos'
        and ((storage.foldername(name))[1] = auth.uid()::text or private.is_coordinator())
    );
