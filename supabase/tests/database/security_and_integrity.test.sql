begin;

create extension if not exists pgtap with schema extensions;
select plan(111);

-- Keep the suite repeatable even after a developer has completed the local wizard.
update public.lab_settings
set name = null,
    acronym = null,
    timezone = 'America/Sao_Paulo',
    privacy_contact_email = null,
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

-- Fixture profiles keep the pre-existing auto-approve behaviour (requires_booking_approval = false)
-- so the rest of this suite's booking-lifecycle assertions stay unchanged.
insert into public.profiles (id, full_name, email, role, is_active, requires_booking_approval) values
  ('00000000-0000-0000-0000-000000000101', 'Coordinator', 'coord@example.com', 'coordinator', true, false),
  ('00000000-0000-0000-0000-000000000102', 'Researcher', 'researcher@example.com', 'researcher', true, false),
  ('00000000-0000-0000-0000-000000000103', 'Other Researcher', 'other@example.com', 'researcher', true, false),
  ('00000000-0000-0000-0000-000000000104', 'Inactive', 'inactive@example.com', 'researcher', false, false);

insert into public.profile_private_data (profile_id, cpf) values
  ('00000000-0000-0000-0000-000000000101', '11111111111'),
  ('00000000-0000-0000-0000-000000000102', '22222222222'),
  ('00000000-0000-0000-0000-000000000103', '33333333333'),
  ('00000000-0000-0000-0000-000000000104', '44444444444');

insert into public.invitations (email, role, invited_by, auth_user_id, expires_at, last_sent_at, created_at) values
  ('invited@example.com', 'coordinator', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000106', now() + interval '1 day', now(), now()),
  ('other-email@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000107', now() + interval '1 day', now(), now()),
  ('expired@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000108', now() - interval '1 minute', now() - interval '1 day', now() - interval '1 day'),
  ('revoked@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000109', now() + interval '1 day', now(), now());
update public.invitations set status = 'revoked', email = null
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
select lives_ok(
  $$ select * from public.get_public_lab_identity() $$,
  'anonymous user can read the minimal public laboratory identity'
);
select is(
  has_function_privilege('anon', 'public.configure_invitation_cleanup(text,text)', 'EXECUTE'),
  false,
  'anonymous user cannot configure invitation cleanup'
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
  $$ select public.complete_lab_installation('Forbidden Lab', 'FL', 'America/Sao_Paulo', 'privacy@example.com') $$,
  'P0001', 'coordinator_required',
  'researcher cannot complete installation'
);
select throws_ok(
  $$ select public.update_lab_settings('Forbidden Lab', 'FL', 'America/Sao_Paulo', 'privacy@example.com') $$,
  'P0001', 'coordinator_required',
  'researcher cannot update laboratory settings'
);
select throws_ok(
  $$ select public.record_invitation_opened() $$,
  'P0001', 'valid_invitation_required',
  'user without a matching invitation cannot mark one as opened'
);

update public.profiles set role = 'coordinator'
where id = '00000000-0000-0000-0000-000000000102';
select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  'researcher',
  'researcher cannot promote their own role'
);

update public.profiles set requires_booking_approval = true
where id = '00000000-0000-0000-0000-000000000102';
select is(
  (select requires_booking_approval from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  false,
  'researcher cannot change their own booking approval requirement'
);

select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000103',
    '[{"agency":"cnpq","agency_other":null}]'::jsonb
  ) $$,
  'P0001', 'funding_grants_forbidden',
  'researcher cannot manage another profile funding grants'
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
  $$ select public.complete_lab_installation('Atomic Lab', 'AL', 'America/Sao_Paulo', 'invalid') $$,
  'P0001', 'invalid_privacy_contact_email',
  'wizard requires a valid institutional privacy contact'
);
select is(
  (select setup_completed_at is null from public.lab_settings where id),
  true,
  'invalid wizard input leaves installation incomplete'
);
select is(
  (
    select count(*) from public.materials
    where id in (
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002'
    )
  ),
  2::bigint,
  'wizard does not add materials to the existing fixtures'
);
select is(
  (
    select count(*) from public.printers
    where id in (
      '20000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002'
    )
  ),
  2::bigint,
  'wizard does not add printers to the existing fixtures'
);
select lives_ok(
  $$ select public.complete_lab_installation(
    'Laboratório Teste', 'LT', 'America/Sao_Paulo', 'privacy@example.com'
  ) $$,
  'coordinator completes installation'
);
select is(
  (select name from public.lab_settings where id),
  'Laboratório Teste',
  'wizard persists laboratory identity'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"other","agency_other":null}]'::jsonb
  ) $$,
  'P0001', 'invalid_grants',
  'other funding agency requires its name'
);
select lives_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"cnpq","agency_other":null},{"agency":"other","agency_other":"Fundacao Local"}]'::jsonb
  ) $$,
  'coordinator registers multiple funding grants for their own profile'
);
select is(
  (select count(*) from public.profile_funding_grants where profile_id = '00000000-0000-0000-0000-000000000101'),
  2::bigint,
  'multiple funding grants are persisted'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"cnpq","agency_other":null,"weekly_hours":100}]'::jsonb
  ) $$,
  '23514', null,
  'weekly hours outside 1-60 is rejected'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"cnpq","agency_other":null,"monthly_value":-1}]'::jsonb
  ) $$,
  '23514', null,
  'negative monthly value is rejected'
);
select lives_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"cnpq","agency_other":null,"grant_name":"IC FAPESP","weekly_hours":20,"monthly_value":700.50}]'::jsonb
  ) $$,
  'coordinator registers a grant with full contract details'
);
select results_eq(
  $$ select grant_name, weekly_hours, monthly_value from public.profile_funding_grants where profile_id = '00000000-0000-0000-0000-000000000101' $$,
  $$ values ('IC FAPESP'::text, 20::integer, 700.50::numeric(10,2)) $$,
  'contract details (name, hours, value) are persisted'
);
select lives_ok(
  $$ select public.update_lab_settings('Laboratório Atualizado', 'LA', 'America/Recife', 'dados@example.com') $$,
  'coordinator updates laboratory identity'
);
select is(
  (select name from public.lab_settings where id),
  'Laboratório Atualizado',
  'laboratory update is persisted'
);
select is(
  (select privacy_contact_email from public.get_public_lab_identity()),
  'dados@example.com',
  'public privacy notice exposes only the configured contact'
);
select throws_ok(
  $$ select public.complete_lab_installation('Again', 'AG', 'America/Sao_Paulo', 'privacy@example.com') $$,
  'P0001', 'installation_already_completed',
  'installation cannot be completed twice'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000105","email":"no-profile@example.com","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'authenticated user without profile cannot read directory');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000106","email":"invited@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.record_invitation_opened() $$, 'explicit acceptance marks the invitation link as confirmed');
set local role postgres;
select ok(
  (select opened_at is not null from public.invitations where auth_user_id = '00000000-0000-0000-0000-000000000106'),
  'opened timestamp is stored before profile completion'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000106","email":"invited@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.create_profile('Invited User') $$, 'valid invitation creates profile');
set local role postgres;
select is(
  (select role::text from public.profiles where email = 'invited@example.com'),
  'coordinator',
  'profile receives the role stored in the invitation'
);
select is(
  (select status::text from public.invitations where accepted_by = '00000000-0000-0000-0000-000000000106'),
  'accepted',
  'invitation is consumed atomically'
);
select is(
  (select email from public.invitations where accepted_by = '00000000-0000-0000-0000-000000000106'),
  null,
  'accepted invitation removes the duplicate recipient email'
);
select is(
  (select auth_user_id from public.invitations where accepted_by = '00000000-0000-0000-0000-000000000106'),
  null,
  'accepted invitation keeps identification through the linked profile only'
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
set local role postgres;
select ok(
  (select status = 'expired' and email is null from public.invitations where auth_user_id = '00000000-0000-0000-0000-000000000108'),
  'expiration preserves anonymous history and removes the email'
);
set local role authenticated;

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
    'First booking', now() + interval '30 minutes', 60, null
  ) $$,
  'first booking succeeds'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'First booking'),
  'approved',
  'profile without approval requirement still auto-approves bookings'
);
select is(
  (select approved_at is null from public.printer_bookings where project_name = 'First booking'),
  true,
  'auto-approved bookings do not stamp approved_at (no approval notification)'
);
select is(
  (select approved_by from public.printer_bookings where project_name = 'First booking'),
  null,
  'auto-approved bookings do not record an approver'
);
select throws_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Conflicting booking', now() + interval '45 minutes', 60, null
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

select lives_ok(
  $$ select public.update_printer_booking(
    (select id from public.printer_bookings where project_name = 'First booking'),
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'First booking updated', now() + interval '30 minutes', 90, 'Updated notes'
  ) $$,
  'researcher edits their active booking through RPC'
);
select is(
  (select project_name from public.printer_bookings where notes = 'Updated notes'),
  'First booking updated',
  'booking edit persists the new operational data'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.update_printer_booking(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Forbidden update', now() + interval '5 days', 60, null
  ) $$,
  'P0001', 'booking_forbidden',
  'researcher cannot edit another profile booking'
);
select throws_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    'in_progress'
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot manage the booking lifecycle'
);
select throws_ok(
  $$ select public.create_maintenance_block(
    '20000000-0000-0000-0000-000000000001',
    now() + interval '6 days', now() + interval '6 days 1 hour',
    'Forbidden maintenance', null
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot create maintenance blocks'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    'in_progress'
  ) $$,
  'coordinator starts an approved booking'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'First booking updated'),
  'in_progress',
  'booking lifecycle status is persisted'
);
select throws_ok(
  $$ select public.update_printer_booking(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Late edit', now() + interval '7 days', 60, null
  ) $$,
  'P0001', 'booking_not_editable',
  'in-progress booking data is immutable'
);
select lives_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    'completed'
  ) $$,
  'coordinator completes an in-progress booking'
);
select throws_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'First booking updated'),
    'in_progress'
  ) $$,
  'P0001', 'invalid_booking_status_transition',
  'terminal booking status cannot move backwards'
);

-- Coordinator-controlled per-profile booking approval requirement
set local role postgres;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000110', 'authenticated', 'authenticated', 'junior@example.com', crypt('password', gen_salt('bf')), now(), '{}', '{}', now(), now(), '', '', '', '');
insert into public.profiles (id, full_name, email, role, is_active, requires_booking_approval) values
  ('00000000-0000-0000-0000-000000000110', 'Junior Researcher', 'junior@example.com', 'researcher', true, true);
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","email":"junior@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Junior booking', now() + interval '10 days', 60, null
  ) $$,
  'researcher flagged for approval can still create a booking'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'Junior booking'),
  'pending',
  'booking from a profile requiring approval starts as pending'
);
select throws_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'Junior booking'),
    'approved'
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot approve their own pending booking'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'Junior booking'),
    'approved'
  ) $$,
  'coordinator approves a pending booking'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'Junior booking'),
  'approved',
  'approved pending booking is persisted'
);
select is(
  (select approved_at >= now() - interval '5 minutes' from public.printer_bookings where project_name = 'Junior booking'),
  true,
  'approving a pending booking stamps approved_at for the researcher notification'
);
select is(
  (select approved_by from public.printer_bookings where project_name = 'Junior booking'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'approving a pending booking records the coordinator as approver'
);

-- Rejection lifecycle: distinct from cancellation, with reason, and frees the slot.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","email":"junior@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Rejected booking', now() + interval '12 days', 60, null
  ) $$,
  'researcher flagged for approval creates a second pending booking'
);
select throws_ok(
  $$ select public.reject_printer_booking(
    (select id from public.printer_bookings where project_name = 'Rejected booking'),
    'No slot available'
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot reject bookings'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.reject_printer_booking(
    (select id from public.printer_bookings where project_name = 'Rejected booking'),
    'Impressora reservada para manutenção'
  ) $$,
  'coordinator rejects a pending booking with a reason'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'Rejected booking'),
  'rejected',
  'rejected booking is persisted with the dedicated status'
);
select is(
  (select rejected_reason from public.printer_bookings where project_name = 'Rejected booking'),
  'Impressora reservada para manutenção',
  'rejection reason is persisted'
);
select is(
  (select rejected_by from public.printer_bookings where project_name = 'Rejected booking'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'rejection records the coordinator as author'
);
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Slot freed booking', now() + interval '12 days', 60, null
  ) $$,
  'rejected booking no longer blocks its time slot'
);
select throws_ok(
  $$ select public.reject_printer_booking(
    (select id from public.printer_bookings where project_name = 'Slot freed booking'),
    null
  ) $$,
  'P0001', 'invalid_booking_status_transition',
  'auto-approved bookings cannot be rejected'
);

-- Temporal validation on the operational lifecycle.
select throws_ok(
  $$ select public.set_printer_booking_status(
    (select id from public.printer_bookings where project_name = 'Junior booking'),
    'in_progress'
  ) $$,
  'P0001', 'booking_not_started',
  'booking starting days from now cannot enter the operational lifecycle'
);

-- Maintenance blocks must be forward-looking.
select throws_ok(
  $$ select public.create_maintenance_block(
    '20000000-0000-0000-0000-000000000001',
    now() - interval '2 days', now() - interval '1 day',
    'Retroactive maintenance', null
  ) $$,
  'P0001', 'invalid_start_time',
  'retroactive maintenance blocks are rejected'
);

-- The approval requirement only applies to researchers: a coordinator flagged the same way
-- still auto-approves, since gating their own bookings behind their own approval is pointless.
update public.profiles set requires_booking_approval = true
where id = '00000000-0000-0000-0000-000000000101';
select lives_ok(
  $$ select public.create_printer_booking(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Coordinator booking', now() + interval '11 days', 60, null
  ) $$,
  'coordinator creates a booking even when flagged for approval'
);
select is(
  (select status::text from public.printer_bookings where project_name = 'Coordinator booking'),
  'approved',
  'coordinator bookings always auto-approve regardless of the approval flag'
);

select lives_ok(
  $$ select public.update_lab_configuration(
    'Configurable Lab', 'CL', 'Europe/Lisbon', 'privacy@example.com', 12, array[1,2,3,4,5,6]
  ) $$,
  'coordinator updates capacity, weekdays and any valid IANA timezone'
);
select is((select workspace_capacity from public.lab_settings where id), 12, 'configured capacity is persisted');
select is((select operating_weekdays from public.lab_settings where id), array[1,2,3,4,5,6], 'operating weekdays are persisted');
select throws_ok(
  $$ select public.update_lab_configuration(
    'Configurable Lab', 'CL', 'Europe/Lisbon', 'privacy@example.com', 12, array[]::integer[]
  ) $$,
  'P0001', 'invalid_operating_weekdays',
  'laboratory must keep at least one operating day'
);
select lives_ok(
  $$ select public.save_lab_schedule_period(null, '23:00', '23:30', 70, true) $$,
  'coordinator creates a non-overlapping schedule period'
);
select throws_ok(
  $$ select public.save_lab_schedule_period(null, '09:00', '11:00', 80, true) $$,
  'P0001', 'schedule_period_overlap',
  'active schedule periods cannot overlap'
);
select is((select count(*) from public.lab_schedule_periods where is_active), 7::bigint, 'new period appears in active schedule');
select lives_ok(
  $$ select public.update_lab_breaks('12:00', '13:00', '18:00', '19:00') $$,
  'coordinator configures lunch and dinner intervals'
);
select is((select lunch_ends_at from public.lab_settings where id), '13:00'::time, 'configured lunch interval is persisted');
select throws_ok(
  $$ select public.update_lab_breaks('09:00', '09:30', '18:00', '19:00') $$,
  'P0001', 'meal_break_overlap',
  'meal intervals cannot overlap active schedule periods'
);
select throws_ok(
  $$ select public.save_lab_schedule_period(null, '12:15', '12:45', 80, true) $$,
  'P0001', 'schedule_period_break_overlap',
  'active schedule periods cannot overlap a meal interval'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.save_lab_schedule_period(null, '23:30', '23:45', 80, true) $$,
  'P0001', 'coordinator_required',
  'researcher cannot configure schedule periods'
);
select throws_ok(
  $$ select public.update_lab_breaks('12:00', '13:00', '18:00', '19:00') $$,
  'P0001', 'coordinator_required',
  'researcher cannot configure meal intervals'
);

select lives_ok(
  $$ select public.set_my_avatar_url('https://example.com/avatar.png') $$,
  'researcher updates their own avatar pointer'
);
select is(
  (select avatar_url from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  'https://example.com/avatar.png',
  'avatar pointer is persisted'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-000000000102/avatar.png') $$,
  'researcher uploads an avatar object into their own storage folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-000000000101/avatar.png') $$,
  '42501', null,
  'researcher cannot upload into another profile avatar folder'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.update_lab_breaks('12:00', '14:00', '13:00', '15:00') $$,
  'P0001', 'invalid_meal_breaks',
  'lunch and dinner intervals cannot overlap each other'
);
select lives_ok(
  $$ select public.update_lab_configuration(
    'Configurable Lab', 'CL', 'America/Sao_Paulo', 'privacy@example.com', 1, array[1,2,3,4,5]
  ) $$,
  'capacity can match current maximum occupancy'
);
select throws_ok(
  $$ select public.replace_profile_availability(
    '00000000-0000-0000-0000-000000000103',
    '[{"weekday":1,"schedule_period_id":"00000000-0000-0000-0000-0000000000b1","work_mode":"onsite"}]'::jsonb
  ) $$,
  'P0001', 'workspace_capacity_reached',
  'transactional availability enforces configured workspace capacity'
);

select * from finish();
rollback;
