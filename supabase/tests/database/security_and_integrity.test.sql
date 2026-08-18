begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

-- Keep the suite repeatable even after a developer has completed the local wizard.
update public.lab_settings
set name = null,
    acronym = null,
    timezone = 'America/Sao_Paulo',
    setup_completed_at = null,
    created_by = null,
    updated_by = null
where id;

-- Deterministic auth fixtures. The transaction is rolled back at the end of the test.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'coord@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'researcher@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'other@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'inactive@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'no-profile@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000106', 'authenticated', 'authenticated', 'invited@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000107', 'authenticated', 'authenticated', 'mismatch@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000108', 'authenticated', 'authenticated', 'expired@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000109', 'authenticated', 'authenticated', 'revoked@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', '');

insert into public.profiles (id, full_name, email, role, is_active) values
  ('00000000-0000-0000-0000-000000000101', 'Coordinator', 'coord@example.com', 'coordinator', true),
  ('00000000-0000-0000-0000-000000000102', 'Researcher', 'researcher@example.com', 'researcher', true),
  ('00000000-0000-0000-0000-000000000103', 'Other Researcher', 'other@example.com', 'researcher', true),
  ('00000000-0000-0000-0000-000000000104', 'Inactive', 'inactive@example.com', 'researcher', false);

insert into public.profile_private_data (profile_id, cpf) values
  ('00000000-0000-0000-0000-000000000101', '11111111111'),
  ('00000000-0000-0000-0000-000000000102', '22222222222'),
  ('00000000-0000-0000-0000-000000000103', '33333333333'),
  ('00000000-0000-0000-0000-000000000104', '44444444444');

insert into public.invitations (email, invited_by, auth_user_id, expires_at, created_at) values
  ('invited@example.com', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000106', now() + interval '1 day', now()),
  ('other-email@example.com', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000107', now() + interval '1 day', now()),
  ('expired@example.com', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000108', now() - interval '1 minute', now() - interval '1 day'),
  ('revoked@example.com', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000109', now() + interval '1 day', now());
update public.invitations set status = 'revoked'
where email = 'revoked@example.com';

insert into public.skills (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'CAD');
insert into public.printers (id, name, status) values
  ('20000000-0000-0000-0000-000000000001', 'Printer A', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'Printer B', 'unavailable');
insert into public.materials (id, name) values
  ('30000000-0000-0000-0000-000000000001', 'PLA'),
  ('30000000-0000-0000-0000-000000000002', 'PETG');
insert into public.printer_materials (printer_id, material_id) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');
insert into public.availability_slots (profile_id, weekday, starts_at, ends_at, work_mode) values
  ('00000000-0000-0000-0000-000000000102', 1, '08:00', '10:00', 'onsite');

set local role anon;
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501', 'permission denied for table profiles',
  'anonymous user cannot read directory'
);
select throws_ok(
  $$ select count(*) from public.lab_settings $$,
  '42501', 'permission denied for table lab_settings',
  'anonymous user cannot read installation settings'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","email":"inactive@example.com","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'inactive profile cannot read directory');
select is((select count(*) from public.lab_settings), 0::bigint, 'inactive profile cannot read installation settings');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);

select results_eq(
  $$ select profile_id from public.profile_private_data order by profile_id $$,
  $$ values ('00000000-0000-0000-0000-000000000102'::uuid) $$,
  'researcher reads only their own private record'
);
select is((select count(*) from public.lab_settings), 1::bigint, 'active researcher reads installation state');
select throws_ok(
  $$ select public.complete_lab_installation('Forbidden Lab', 'FL', 'America/Sao_Paulo') $$,
  'P0001', 'coordinator_required',
  'researcher cannot complete installation'
);
select throws_ok(
  $$ select public.update_lab_settings('Forbidden Lab', 'FL', 'America/Sao_Paulo') $$,
  'P0001', 'coordinator_required',
  'researcher cannot update laboratory settings'
);

update public.profiles set role = 'coordinator'
where id = '00000000-0000-0000-0000-000000000102';
select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  'researcher',
  'researcher cannot promote their own role'
);

select throws_ok(
  $$ insert into public.skills (name) values ('Forbidden skill') $$,
  '42501',
  null,
  'researcher cannot manage catalogs'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select is(
  (
    select count(*) from public.profile_private_data
    where profile_id in (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104'
    )
  ),
  4::bigint,
  'coordinator reads all private fixture records'
);
select throws_ok(
  $$ select public.complete_lab_installation(
    'Atomic Lab', 'AL', 'America/Sao_Paulo', '[]'::jsonb,
    '[{"name":"Rolled Back Printer","material_names":["Missing"]}]'::jsonb
  ) $$,
  'P0001', 'unknown_initial_material: Missing',
  'invalid wizard catalog fails atomically'
);
select is(
  (select setup_completed_at is null from public.lab_settings where id),
  true,
  'failed wizard leaves installation incomplete'
);
select is(
  (select count(*) from public.printers where name = 'Rolled Back Printer'),
  0::bigint,
  'failed wizard rolls catalog changes back'
);
select lives_ok(
  $$ select public.complete_lab_installation(
    'Laboratório Teste', 'LT', 'America/Sao_Paulo',
    '[{"name":"Resina","description":"Inicial"}]'::jsonb,
    '[{"name":"Printer Setup","model":"M1","location":"Sala","material_names":["Resina"]}]'::jsonb
  ) $$,
  'coordinator completes installation'
);
select is(
  (select name from public.lab_settings where id),
  'Laboratório Teste',
  'wizard persists laboratory identity'
);
select lives_ok(
  $$ select public.update_lab_settings('Laboratório Atualizado', 'LA', 'America/Recife') $$,
  'coordinator updates laboratory identity'
);
select is(
  (select name from public.lab_settings where id),
  'Laboratório Atualizado',
  'laboratory update is persisted'
);
select throws_ok(
  $$ select public.complete_lab_installation('Again', 'AG', 'America/Sao_Paulo') $$,
  'P0001', 'installation_already_completed',
  'installation cannot be completed twice'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000105","email":"no-profile@example.com","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'authenticated user without profile cannot read directory');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000106","email":"invited@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.create_profile('Invited User') $$, 'valid invitation creates profile');
set local role postgres;
select is(
  (select status::text from public.invitations where email = 'invited@example.com'),
  'accepted',
  'invitation is consumed atomically'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000106","email":"invited@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.create_profile('Invited Again') $$,
  'P0001', 'valid_invitation_required',
  'accepted invitation cannot be reused'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000107","email":"mismatch@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.create_profile('Mismatch') $$,
  'P0001', 'valid_invitation_required',
  'authenticated email must match invitation'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000108","email":"expired@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.create_profile('Expired') $$,
  'P0001', 'valid_invitation_required',
  'expired invitation is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000109","email":"revoked@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.create_profile('Revoked') $$,
  'P0001', 'valid_invitation_required',
  'revoked invitation is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.replace_profile_availability(
    '00000000-0000-0000-0000-000000000102',
    '[{"weekday":8,"starts_at":"10:00","ends_at":"09:00","work_mode":"onsite"}]'::jsonb
  ) $$,
  'P0001', 'invalid_slots',
  'invalid availability replacement fails'
);
select is(
  (select count(*) from public.availability_slots where profile_id = '00000000-0000-0000-0000-000000000102'),
  1::bigint,
  'failed availability replacement preserves previous rows'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.replace_printer_materials(
    '20000000-0000-0000-0000-000000000001',
    array['39999999-0000-0000-0000-000000000099'::uuid]
  ) $$,
  'P0001', 'invalid_material',
  'invalid material replacement fails'
);
select is(
  (select count(*) from public.printer_materials where printer_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'failed material replacement preserves previous rows'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'First booking', now() + interval '1 day', 60, null
  ) $$,
  'first booking succeeds'
);
select throws_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Conflicting booking', now() + interval '1 day 30 minutes', 60, null
  ) $$,
  'P0001', 'booking_conflict',
  'overlapping booking is rejected'
);
select is(
  (select count(*) from public.printer_bookings where printer_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'exactly one overlapping booking remains'
);
select throws_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'Wrong material', now() + interval '2 days', 60, null
  ) $$,
  'P0001', 'incompatible_material',
  'incompatible material is rejected'
);
select throws_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'Unavailable printer', now() + interval '2 days', 60, null
  ) $$,
  'P0001', 'printer_unavailable',
  'unavailable printer is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_maintenance_block(
    '20000000-0000-0000-0000-000000000001',
    now() + interval '3 days', now() + interval '3 days 2 hours',
    'Preventive maintenance', null
  ) $$,
  'coordinator creates maintenance through RPC'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Maintenance conflict', now() + interval '3 days 30 minutes', 60, null
  ) $$,
  'P0001', 'maintenance_conflict',
  'booking over maintenance is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Other booking', now() + interval '4 days', 60, null
  ) $$,
  'another researcher creates their booking'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.cancel_printer_booking(
    (select id from public.printer_bookings where project_name = 'Other booking')
  ) $$,
  'P0001', 'booking_forbidden',
  'researcher cannot cancel another profile booking'
);

select * from finish();
rollback;
