begin;

create extension if not exists pgtap with schema extensions;
select plan(403);

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

-- Booking fixtures: every booking belongs to a project. Each project is named after the booking that
-- uses it, so project_name (a snapshot of the project name) still identifies the booking.
insert into public.projects (id, name, created_by) select v.id::uuid, v.name, '00000000-0000-0000-0000-000000000101' from (values
  ('00000000-0000-0000-0000-0000000000e1', 'First booking'),
  ('00000000-0000-0000-0000-0000000000e2', 'Conflicting booking'),
  ('00000000-0000-0000-0000-0000000000e3', 'Wrong material'),
  ('00000000-0000-0000-0000-0000000000e4', 'Unavailable printer'),
  ('00000000-0000-0000-0000-0000000000e5', 'Maintenance conflict'),
  ('00000000-0000-0000-0000-0000000000e6', 'Other booking'),
  ('00000000-0000-0000-0000-0000000000e7', 'First booking updated'),
  ('00000000-0000-0000-0000-0000000000e8', 'Forbidden update'),
  ('00000000-0000-0000-0000-0000000000e9', 'Late edit'),
  ('00000000-0000-0000-0000-000000000100', 'Junior booking'),
  ('00000000-0000-0000-0000-000000000101', 'Rejected booking'),
  ('00000000-0000-0000-0000-000000000102', 'Slot freed booking'),
  ('00000000-0000-0000-0000-000000000103', 'Coordinator booking'),
  ('00000000-0000-0000-0000-0000000000ee', 'Projeto sem membros'),
  ('00000000-0000-0000-0000-0000000000ef', 'Projeto concluido')
) as v(id, name);
update public.projects set status = 'completed' where id = '00000000-0000-0000-0000-0000000000ef';
insert into public.project_members (project_id, profile_id)
select p.id, m.profile_id
from public.projects p
cross join (values ('00000000-0000-0000-0000-000000000102'::uuid), ('00000000-0000-0000-0000-000000000103'::uuid)) as m(profile_id)
where p.id <> '00000000-0000-0000-0000-0000000000ee';

insert into public.invitations (email, role, invited_by, auth_user_id, expires_at, last_sent_at, created_at) values
  ('invited@example.com', 'coordinator', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000106', now() + interval '1 day', now(), now()),
  ('other-email@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000107', now() + interval '1 day', now(), now()),
  ('expired@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000108', now() - interval '1 minute', now() - interval '1 day', now() - interval '1 day'),
  ('revoked@example.com', 'researcher', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000109', now() + interval '1 day', now(), now());
update public.invitations set status = 'revoked', email = null
where email = 'revoked@example.com';

insert into public.skills (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'CAD');
insert into public.equipment (id, name, status, type_id) values
  ('20000000-0000-0000-0000-000000000001', 'Printer A', 'active', (select id from public.equipment_types where name = 'Impressora 3D')),
  ('20000000-0000-0000-0000-000000000002', 'Printer B', 'unavailable', (select id from public.equipment_types where name = 'Impressora 3D')),
  ('20000000-0000-0000-0000-000000000003', 'Scanner A', 'active', (select id from public.equipment_types where name = 'Scanner 3D'));
insert into public.materials (id, name) values
  ('30000000-0000-0000-0000-000000000001', 'PLA'),
  ('30000000-0000-0000-0000-000000000002', 'PETG');
insert into public.equipment_materials (equipment_id, material_id) values
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
    select count(*) from public.equipment
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
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"sus","agency_other":null}]'::jsonb
  ) $$,
  'P0001', 'invalid_grants',
  'SUS is no longer accepted as a funding agency'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"fap","agency_other":null,"start_date":"2026-06-01","end_date":"2026-01-01"}]'::jsonb
  ) $$,
  'P0001', 'invalid_grants',
  'grant end date before its start date is rejected'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"fap","agency_other":null,"project_id":"00000000-0000-0000-0000-00000000dead"}]'::jsonb
  ) $$,
  'P0001', 'invalid_grants',
  'grant for a project that does not exist is rejected'
);
select lives_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"fap","agency_other":null,"weekly_hours":20,"monthly_value":700,"start_date":"2020-01-01","end_date":"2099-12-31","process_number":"2025/12345-6"}]'::jsonb
  ) $$,
  'coordinator registers a grant with period and process number'
);
select results_eq(
  $$ select process_number, start_date, end_date from public.profile_funding_grants where profile_id = '00000000-0000-0000-0000-000000000101' $$,
  $$ values ('2025/12345-6'::text, '2020-01-01'::date, '2099-12-31'::date) $$,
  'grant period and process number are persisted'
);
select throws_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"fap","agency_other":null,"contract_path":"00000000-0000-0000-0000-000000000103/termo.pdf"}]'::jsonb
  ) $$,
  'P0001', 'invalid_grants',
  'contract file outside the grant owner folder is rejected'
);
select lives_ok(
  $$ select public.replace_profile_funding_grants(
    '00000000-0000-0000-0000-000000000101',
    '[{"agency":"fap","agency_other":null,"contract_path":"00000000-0000-0000-0000-000000000101/termo.pdf"}]'::jsonb
  ) $$,
  'grant keeps its contract file path when saved'
);
select results_eq(
  $$ select contract_path from public.get_grant_contracts('00000000-0000-0000-0000-000000000101') $$,
  $$ values ('00000000-0000-0000-0000-000000000101/termo.pdf'::text) $$,
  'owner reads their grant contract path'
);
select throws_ok(
  $$ select public.set_grant_contract(
    (select id from public.profile_funding_grants where profile_id = '00000000-0000-0000-0000-000000000101' limit 1),
    '00000000-0000-0000-0000-000000000103/outro.pdf'
  ) $$,
  'P0001', 'invalid_contract_path',
  'contract path must be inside the grant owner folder'
);
select is(
  public.set_grant_contract(
    (select id from public.profile_funding_grants where profile_id = '00000000-0000-0000-0000-000000000101' limit 1),
    null
  ),
  '00000000-0000-0000-0000-000000000101/termo.pdf'::text,
  'removing the contract returns the old path so the file can be deleted'
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
  $$ select public.replace_equipment_materials(
    '20000000-0000-0000-0000-000000000001',
    array['39999999-0000-0000-0000-000000000099'::uuid]
  ) $$,
  'P0001', 'invalid_material',
  'invalid material replacement fails'
);
select is(
  (select count(*) from public.equipment_materials where equipment_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'failed material replacement preserves previous rows'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e1', now() + interval '30 minutes', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'first booking succeeds'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'First booking'),
  'approved',
  'profile without approval requirement still auto-approves bookings'
);
select is(
  (select approved_at is null from public.equipment_bookings where project_name = 'First booking'),
  true,
  'auto-approved bookings do not stamp approved_at (no approval notification)'
);
select is(
  (select approved_by from public.equipment_bookings where project_name = 'First booking'),
  null,
  'auto-approved bookings do not record an approver'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e2', now() + interval '45 minutes', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'booking_conflict',
  'overlapping booking is rejected'
);
select is(
  (select count(*) from public.equipment_bookings where equipment_id = '20000000-0000-0000-0000-000000000001'),
  1::bigint,
  'exactly one overlapping booking remains'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e3', now() + interval '2 days', 60,
    '30000000-0000-0000-0000-000000000002', null
  ) $$,
  'P0001', 'incompatible_material',
  'incompatible material is rejected'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-0000000000e4', now() + interval '2 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'equipment_unavailable',
  'unavailable printer is rejected'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e3', now() + interval '2 days', 60
  ) $$,
  'P0001', 'material_required',
  'a printer booking requires a material'
);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-0000000000e3', now() + interval '2 days', 60
  ) $$,
  'equipment whose type does not use material is booked without one'
);
select is(
  (select material_id is null from public.equipment_bookings where project_name = 'Wrong material'),
  true,
  'a booking of equipment without material stores no material'
);
select throws_ok(
  $$ insert into public.equipment_types (name, uses_material) values ('Torno', false) $$,
  '42501', null,
  'researcher cannot create equipment types'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    null::uuid, now() + interval '2 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'project_required',
  'a booking requires a project'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000ee', now() + interval '2 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'project_not_available',
  'a researcher cannot book on a project they are not a member of'
);
select throws_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000ef', now() + interval '2 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'project_not_available',
  'a completed project does not accept new bookings'
);
select is(
  (select project_id from public.equipment_bookings where project_name = 'First booking'),
  '00000000-0000-0000-0000-0000000000e1'::uuid,
  'a booking stores the project it belongs to'
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
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e5', now() + interval '3 days 30 minutes', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'maintenance_conflict',
  'booking over maintenance is rejected'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e6', now() + interval '4 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'another researcher creates their booking'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.cancel_booking(
    (select id from public.equipment_bookings where project_name = 'Other booking')
  ) $$,
  'P0001', 'booking_forbidden',
  'researcher cannot cancel another profile booking'
);

select lives_ok(
  $$ select public.update_booking(
    (select id from public.equipment_bookings where project_name = 'First booking'),
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e7', now() + interval '30 minutes', 90,
    '30000000-0000-0000-0000-000000000001', 'Updated notes'
  ) $$,
  'researcher edits their active booking through RPC'
);
select is(
  (select project_name from public.equipment_bookings where notes = 'Updated notes'),
  'First booking updated',
  'booking edit persists the new operational data'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.update_booking(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e8', now() + interval '5 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'booking_forbidden',
  'researcher cannot edit another profile booking'
);
select throws_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
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
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
    'in_progress'
  ) $$,
  'coordinator starts an approved booking'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'First booking updated'),
  'in_progress',
  'booking lifecycle status is persisted'
);
select throws_ok(
  $$ select public.update_booking(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-0000000000e9', now() + interval '7 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'P0001', 'booking_not_editable',
  'in-progress booking data is immutable'
);
select lives_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
    'completed'
  ) $$,
  'coordinator completes an in-progress booking'
);
select throws_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'First booking updated'),
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
insert into public.project_members (project_id, profile_id)
select id, '00000000-0000-0000-0000-000000000110' from public.projects
where name in ('Junior booking', 'Rejected booking', 'Slot freed booking');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","email":"junior@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000100', now() + interval '10 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'researcher flagged for approval can still create a booking'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'Junior booking'),
  'pending',
  'booking from a profile requiring approval starts as pending'
);
select throws_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'Junior booking'),
    'approved'
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot approve their own pending booking'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'Junior booking'),
    'approved'
  ) $$,
  'coordinator approves a pending booking'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'Junior booking'),
  'approved',
  'approved pending booking is persisted'
);
select is(
  (select approved_at >= now() - interval '5 minutes' from public.equipment_bookings where project_name = 'Junior booking'),
  true,
  'approving a pending booking stamps approved_at for the researcher notification'
);
select is(
  (select approved_by from public.equipment_bookings where project_name = 'Junior booking'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'approving a pending booking records the coordinator as approver'
);

-- Rejection lifecycle: distinct from cancellation, with reason, and frees the slot.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","email":"junior@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101', now() + interval '12 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'researcher flagged for approval creates a second pending booking'
);
select throws_ok(
  $$ select public.reject_booking(
    (select id from public.equipment_bookings where project_name = 'Rejected booking'),
    'No slot available'
  ) $$,
  'P0001', 'coordinator_required',
  'researcher cannot reject bookings'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.reject_booking(
    (select id from public.equipment_bookings where project_name = 'Rejected booking'),
    'Impressora reservada para manutenção'
  ) $$,
  'coordinator rejects a pending booking with a reason'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'Rejected booking'),
  'rejected',
  'rejected booking is persisted with the dedicated status'
);
select is(
  (select rejected_reason from public.equipment_bookings where project_name = 'Rejected booking'),
  'Impressora reservada para manutenção',
  'rejection reason is persisted'
);
select is(
  (select rejected_by from public.equipment_bookings where project_name = 'Rejected booking'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'rejection records the coordinator as author'
);
select lives_ok(
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000102', now() + interval '12 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'rejected booking no longer blocks its time slot'
);
select throws_ok(
  $$ select public.reject_booking(
    (select id from public.equipment_bookings where project_name = 'Slot freed booking'),
    null
  ) $$,
  'P0001', 'invalid_booking_status_transition',
  'auto-approved bookings cannot be rejected'
);

-- Temporal validation on the operational lifecycle.
select throws_ok(
  $$ select public.set_booking_status(
    (select id from public.equipment_bookings where project_name = 'Junior booking'),
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
  $$ select public.create_booking(
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000103', now() + interval '11 days', 60,
    '30000000-0000-0000-0000-000000000001', null
  ) $$,
  'coordinator creates a booking even when flagged for approval'
);
select is(
  (select status::text from public.equipment_bookings where project_name = 'Coordinator booking'),
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

-- Projects, members and funding.
-- Drop the memberships created for the booking fixtures so the visibility counts below only see this project.
reset role;
delete from public.project_members;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.projects (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Projeto Alfa') $$,
  'coordinator creates a project'
);
select lives_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array['00000000-0000-0000-0000-000000000102']::uuid[]) $$,
  'coordinator sets project members'
);
select throws_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array['00000000-0000-0000-0000-000000000104']::uuid[]) $$,
  'P0001', 'invalid_project_members',
  'inactive profiles cannot be project members'
);
select lives_ok(
  $$ select public.replace_project_funding(
    '00000000-0000-0000-0000-0000000000c1',
    jsonb_build_array(jsonb_build_object(
      'agency_id', (select id from public.funding_agencies where acronym = 'FAPESP'),
      'process_number', '2026/00001-0',
      'items', jsonb_build_array(
        jsonb_build_object('category', 'capital', 'amount', 1000),
        jsonb_build_object('category', 'custeio', 'amount', 250.5)
      )
    ))
  ) $$,
  'coordinator sets project funding with amounts per category'
);
select is(
  (select sum(i.amount) from public.project_funding_items i join public.project_funding f on f.id = i.funding_id where f.project_id = '00000000-0000-0000-0000-0000000000c1'),
  1250.50::numeric,
  'funding items keep the granted amounts'
);
select throws_ok(
  $$ select public.replace_project_funding(
    '00000000-0000-0000-0000-0000000000c1',
    jsonb_build_array(jsonb_build_object(
      'agency_id', (select id from public.funding_agencies where acronym = 'FAPESP'),
      'items', jsonb_build_array(jsonb_build_object('category', 'capital', 'amount', -1))
    ))
  ) $$,
  'P0001', 'invalid_funding',
  'negative funding amounts are rejected'
);
select is(
  (select count(*) from public.project_funding where project_id = '00000000-0000-0000-0000-0000000000c1'),
  1::bigint,
  'a rejected funding replacement keeps the previous funding'
);
select throws_ok(
  $$ select public.replace_project_funding(
    '00000000-0000-0000-0000-0000000000c1',
    jsonb_build_array(jsonb_build_object('agency_id', '00000000-0000-0000-0000-00000000dead', 'items', '[]'::jsonb))
  ) $$,
  'P0001', 'invalid_funding',
  'funding requires a registered agency'
);
select lives_ok(
  $$ insert into public.funding_agencies (acronym, name) values ('FUNDECT', 'Fundação de Apoio à Pesquisa de Mato Grosso do Sul') $$,
  'coordinator registers a new funding agency'
);
select throws_ok(
  $$ insert into public.funding_agencies (acronym) values ('fapesp') $$,
  '23505', null,
  'agency acronyms are unique regardless of case'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is((select count(*) from public.projects), 1::bigint, 'project member reads the project');
select is((select count(*) from public.project_members), 1::bigint, 'project member reads the member list');
select is((select count(*) from public.project_funding), 1::bigint, 'project member reads the funding');
select is((select count(*) from public.project_funding_items), 2::bigint, 'project member reads the funding items');
select throws_ok(
  $$ insert into public.projects (name) values ('Projeto Beta') $$,
  '42501', null,
  'researcher cannot create projects'
);
select throws_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array[]::uuid[]) $$,
  'P0001', 'coordinator_required',
  'researcher cannot change project members'
);
select throws_ok(
  $$ select public.replace_project_funding('00000000-0000-0000-0000-0000000000c1', '[]'::jsonb) $$,
  'P0001', 'coordinator_required',
  'researcher cannot change project funding'
);
select throws_ok(
  $$ insert into public.funding_agencies (acronym) values ('XYZ') $$,
  '42501', null,
  'researcher cannot register funding agencies'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is((select count(*) from public.projects), 0::bigint, 'non-member cannot read the project');
select is((select count(*) from public.project_funding_items), 0::bigint, 'non-member cannot read the funding items');

reset role;
select is(
  has_table_privilege('anon', 'public.projects', 'SELECT'),
  false,
  'anonymous users have no access to projects'
);
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array[]::uuid[]) $$,
  'coordinator removes every project member'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is((select count(*) from public.projects), 0::bigint, 'a removed member no longer reads the project');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- Project tasks (kanban).
select lives_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array['00000000-0000-0000-0000-000000000102']::uuid[]) $$,
  'coordinator adds the researcher back to the project'
);
select lives_ok(
  $$ insert into public.project_tasks (id, project_id, title) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Montar impressora') $$,
  'coordinator creates a task'
);
select lives_ok(
  $$ select public.set_task_assignees('00000000-0000-0000-0000-0000000000d1', array['00000000-0000-0000-0000-000000000102']::uuid[]) $$,
  'coordinator assigns a project member to the task'
);
select throws_ok(
  $$ select public.set_task_assignees('00000000-0000-0000-0000-0000000000d1', array['00000000-0000-0000-0000-000000000103']::uuid[]) $$,
  'P0001', 'assignee_must_be_project_member',
  'only project members can be assigned to a task'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is((select count(*) from public.project_tasks), 1::bigint, 'project member reads the tasks');
select is((select count(*) from public.project_task_assignees), 1::bigint, 'project member reads the task assignees');
select lives_ok(
  $$ update public.project_tasks set status = 'review' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'project member moves a task between columns'
);
select is(
  (select status::text from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1'),
  'review',
  'the task keeps its new column'
);
select lives_ok(
  $$ insert into public.project_tasks (id, project_id, title) values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Calibrar mesa') $$,
  'project member creates a task'
);
select throws_ok(
  $$ insert into public.project_tasks (project_id, title, created_by) values ('00000000-0000-0000-0000-0000000000c1', 'Em nome de outro', '00000000-0000-0000-0000-000000000101') $$,
  '42501', null,
  'a task cannot be created in someone else name'
);
select lives_ok(
  $$ delete from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'deleting a task created by someone else is silently ignored'
);
select is((select count(*) from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1'), 1::bigint, 'a member cannot delete a task created by someone else');
select lives_ok(
  $$ delete from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d2' $$,
  'the creator deletes their own task'
);
select is((select count(*) from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d2'), 0::bigint, 'the deleted task is gone');
select lives_ok(
  $$ update public.project_tasks set priority = 'high' where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'a member sets the high priority'
);
select is(
  (select priority::text from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1'),
  'high',
  'the high priority is stored'
);
select lives_ok(
  $$ update public.project_tasks set archived_at = now() where id = '00000000-0000-0000-0000-0000000000d1' $$,
  'a member archives a task created by someone else'
);
select ok(
  (select archived_at is not null from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1'),
  'the archived task is kept'
);
select is(
  (select count(*)::int from public.notifications where type = 'task_assigned' and recipient_id = '00000000-0000-0000-0000-000000000102'),
  1,
  'being assigned a task by someone else creates a notification'
);
select lives_ok(
  $$ insert into public.project_tasks (id, project_id, title, status) values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'Imprimir peça', 'review') $$,
  'a task can be created directly in a column'
);
select is(
  (select position from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d3'),
  (select position + 1 from public.project_tasks where id = '00000000-0000-0000-0000-0000000000d1'),
  'a task entering a column goes to its end'
);

select lives_ok(
  $$ select public.set_task_checklist('00000000-0000-0000-0000-0000000000d1', '[{"id":"00000000-0000-0000-0000-0000000000a1","title":"Medir","done":false},{"id":"00000000-0000-0000-0000-0000000000a2","title":"Imprimir","done":false}]'::jsonb) $$,
  'a member writes the checklist of a task'
);
select is((select count(*)::int from public.project_task_checklist_items where task_id = '00000000-0000-0000-0000-0000000000d1'), 2, 'the checklist items are stored');
select lives_ok(
  $$ update public.project_task_checklist_items set done = true where id = '00000000-0000-0000-0000-0000000000a1' $$,
  'a member ticks a checklist item'
);
select ok((select done from public.project_task_checklist_items where id = '00000000-0000-0000-0000-0000000000a1'), 'the ticked item stays done');
select lives_ok(
  $$ select public.set_task_checklist('00000000-0000-0000-0000-0000000000d1', '[{"id":"00000000-0000-0000-0000-0000000000a2","title":"Imprimir","done":false}]'::jsonb) $$,
  'a member removes a checklist item by leaving it out'
);
select is((select count(*)::int from public.project_task_checklist_items where task_id = '00000000-0000-0000-0000-0000000000d1'), 1, 'the removed item is gone');
select lives_ok(
  $$ select public.move_project_task('00000000-0000-0000-0000-0000000000d3', 'review', '00000000-0000-0000-0000-0000000000d1') $$,
  'a member reorders a task inside a column'
);
select is(
  (select array_agg(id::text order by position) from public.project_tasks where project_id = '00000000-0000-0000-0000-0000000000c1' and status = 'review'),
  array['00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d1'],
  'the task goes right before the chosen one and the column is renumbered'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is((select count(*) from public.project_tasks), 0::bigint, 'non-member cannot read tasks');
select throws_ok(
  $$ insert into public.project_tasks (project_id, title) values ('00000000-0000-0000-0000-0000000000c1', 'Intruso') $$,
  '42501', null,
  'non-member cannot create tasks'
);
select throws_ok(
  $$ select public.set_task_assignees('00000000-0000-0000-0000-0000000000d1', array['00000000-0000-0000-0000-000000000102']::uuid[]) $$,
  'P0001', 'project_access_required',
  'non-member cannot assign task members'
);
select is((select count(*) from public.project_task_checklist_items), 0::bigint, 'non-member cannot read checklist items');
select throws_ok(
  $$ select public.set_task_checklist('00000000-0000-0000-0000-0000000000d1', '[]'::jsonb) $$,
  'P0001', 'project_access_required',
  'non-member cannot change a checklist'
);
select throws_ok(
  $$ select public.move_project_task('00000000-0000-0000-0000-0000000000d1', 'done', null) $$,
  'P0001', 'project_access_required',
  'non-member cannot move tasks'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c1', array[]::uuid[]) $$,
  'coordinator removes the member from the project'
);
select is((select count(*) from public.project_task_assignees where project_id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint, 'removing a member removes them from the tasks');

-- Inventory: spools, spool choice in bookings and consumption.
reset role;
insert into public.material_spools (id, material_id, color_name, initial_amount, current_amount, project_id) values
  ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-000000000001', 'Branco', 1000, 1000, null),
  ('00000000-0000-0000-0000-0000000000f2', '30000000-0000-0000-0000-000000000001', 'Preto', 1000, 1000, '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000f3', '30000000-0000-0000-0000-000000000002', 'Azul', 500, 500, null);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

select throws_ok(
  $$ insert into public.material_spools (material_id, color_name, initial_amount, current_amount) values ('30000000-0000-0000-0000-000000000001', 'Vermelho', 100, 150) $$,
  '23514', null,
  'a spool cannot have more weight than it started with'
);
select lives_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '30 days', 60, '30000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-0000000000f1') $$,
  'a booking can use a spool from the general stock'
);
select is(
  (select spool_id from public.equipment_bookings where equipment_id = '20000000-0000-0000-0000-000000000001' and starts_at > now() + interval '29 days' and spool_id = '00000000-0000-0000-0000-0000000000f1'),
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'the booking stores the spool'
);
select throws_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e2', now() + interval '31 days', 60, '30000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-0000000000f2') $$,
  'P0001', 'spool_not_available',
  'a spool of another project cannot be used'
);
select throws_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '31 days', 60, '30000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-0000000000f3') $$,
  'P0001', 'spool_not_available',
  'a spool of another material cannot be used'
);
select lives_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '32 days', 60, '30000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-0000000000f2') $$,
  'a booking can use a spool of its own project'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.material_spools where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3')),
  3::bigint,
  'any active user reads the inventory'
);
select throws_ok(
  $$ insert into public.material_spools (material_id, color_name, initial_amount, current_amount) values ('30000000-0000-0000-0000-000000000001', 'Verde', 100, 100) $$,
  '42501', null,
  'researcher cannot register spools'
);
select lives_ok(
  $$ update public.material_spools set current_amount = 1 where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a researcher update on a spool is silently ignored'
);
select is(
  (select current_amount from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'),
  1000.00::numeric,
  'the spool weight is untouched by a researcher'
);
select throws_ok(
  $$ select public.record_booking_usage((select id from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f1'), 10) $$,
  'P0001', 'booking_forbidden',
  'a researcher cannot record usage on someone else booking'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.record_booking_usage((select id from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f2'), 10) $$,
  'P0001', 'usage_not_allowed',
  'usage is only recorded once the booking started'
);
reset role;
update public.equipment_bookings set status = 'completed' where spool_id = '00000000-0000-0000-0000-0000000000f1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.record_booking_usage((select id from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f1'), 250) $$,
  'coordinator records the amount used'
);
select is((select current_amount from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'), 750.00::numeric, 'the amount used is taken off the spool');
select is((select status::text from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'), 'in_use', 'a spool that lost weight is in use');
select lives_ok(
  $$ select public.record_booking_usage((select id from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f1'), 100) $$,
  'the amount used can be corrected'
);
select is((select current_amount from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'), 900.00::numeric, 'a correction gives the previous amount back first');
select lives_ok(
  $$ select public.record_booking_usage((select id from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f1'), 5000) $$,
  'an amount above what is left is capped'
);
select is((select current_amount from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'), 0.00::numeric, 'the spool runs out');
select is((select status::text from public.material_spools where id = '00000000-0000-0000-0000-0000000000f1'), 'empty', 'an empty spool is marked empty');
select is((select consumed_amount from public.equipment_bookings where spool_id = '00000000-0000-0000-0000-0000000000f1'), 1000.00::numeric, 'the booking keeps the capped amount');
select throws_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '33 days', 60, '30000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-0000000000f1') $$,
  'P0001', 'spool_not_available',
  'an empty spool cannot be chosen'
);

-- Equipment maintenance as a state with history.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Troca do bico') $$,
  'P0001', 'maintainer_required',
  'a researcher cannot put equipment in maintenance'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', '   ') $$,
  'P0001', 'reason_required',
  'maintenance needs a reason'
);
select lives_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e1', now() + interval '50 days', 60) $$,
  'a future booking exists before the maintenance'
);
select lives_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Troca do bico', 'Peça já pedida', (current_date + 7), true) $$,
  'coordinator puts the equipment in maintenance and cancels its upcoming bookings'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'maintenance', 'the equipment status becomes maintenance');
select is(
  (select count(*) from public.equipment_maintenance where equipment_id = '20000000-0000-0000-0000-000000000003' and ended_at is null),
  1::bigint,
  'one open maintenance episode is recorded'
);
select is(
  (select status::text from public.equipment_bookings where equipment_id = '20000000-0000-0000-0000-000000000003' and starts_at > now() + interval '49 days'),
  'cancelled',
  'the upcoming booking was cancelled with the maintenance'
);
select throws_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Outra vez') $$,
  'P0001', 'maintenance_already_open',
  'an equipment already in maintenance cannot enter it again'
);
select throws_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e1', now() + interval '52 days', 60) $$,
  'P0001', 'equipment_unavailable',
  'new bookings are refused while in maintenance'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.equipment_maintenance where equipment_id = '20000000-0000-0000-0000-000000000003'),
  1::bigint,
  'any active user reads the maintenance history'
);
select throws_ok(
  $$ insert into public.equipment_maintenance (equipment_id, reason) values ('20000000-0000-0000-0000-000000000003', 'Direto') $$,
  '42501', null,
  'maintenance is not written directly'
);
select throws_ok(
  $$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003') $$,
  'P0001', 'maintainer_required',
  'a researcher cannot release the equipment'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Bico trocado e calibrado') $$,
  'coordinator releases the equipment'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'active', 'the equipment is active again');
select is(
  (select ended_at is not null and resolution_notes = 'Bico trocado e calibrado' from public.equipment_maintenance where equipment_id = '20000000-0000-0000-0000-000000000003'),
  true,
  'the episode keeps when it ended and what was done'
);
select throws_ok(
  $$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003') $$,
  'P0001', 'not_in_maintenance',
  'releasing an equipment that is not in maintenance fails'
);

select lives_ok(
  $$ select public.create_booking('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e1', now() + interval '61 days', 60) $$,
  'another future booking is created'
);
reset role;
update public.equipment_bookings set status = 'in_progress' where equipment_id = '20000000-0000-0000-0000-000000000003' and starts_at > now() + interval '60 days';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Segunda parada', null, null, true) $$,
  'a second maintenance can start after the release'
);
select is(
  (select status::text from public.equipment_bookings where equipment_id = '20000000-0000-0000-0000-000000000003' and starts_at > now() + interval '60 days'),
  'in_progress',
  'a booking already in progress is not cancelled'
);
select lives_ok(
  $$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003') $$,
  'the second maintenance is released'
);

-- Feedback box.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.feedback_reports (kind, message, page_path) values ('bug', 'pgtap erro na tela de reservas', '/reservas') $$,
  'an active user sends feedback'
);
select throws_ok(
  $$ insert into public.feedback_reports (kind, message, created_by) values ('bug', 'pgtap em nome de outro', '00000000-0000-0000-0000-000000000101') $$,
  '42501', null,
  'feedback cannot be sent in someone else name'
);
select throws_ok(
  $$ insert into public.feedback_reports (kind, message, status) values ('bug', 'pgtap ja resolvido', 'done') $$,
  '42501', null,
  'feedback always starts as new'
);
select throws_ok(
  $$ insert into public.feedback_reports (kind, message) values ('bug', 'ab') $$,
  '23514', null,
  'a feedback message needs at least three characters'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.feedback_reports (kind, message) values ('suggestion', 'pgtap sugestao da coordenacao') $$,
  'a coordinator also sends feedback'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.feedback_reports where message like 'pgtap%'),
  1::bigint,
  'a researcher only reads their own feedback'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.feedback_reports where message like 'pgtap%'),
  0::bigint,
  'another researcher does not read it'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select is(
  (select count(*) from public.feedback_reports where message like 'pgtap%'),
  2::bigint,
  'the coordinator reads every feedback'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ update public.feedback_reports set status = 'done' where message like 'pgtap erro%' $$,
  'a researcher update on feedback is silently ignored'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select is(
  (select status::text from public.feedback_reports where message like 'pgtap erro%'),
  'new',
  'the status was not changed by the researcher'
);
select lives_ok(
  $$ update public.feedback_reports set status = 'seen', coordinator_note = 'Vamos olhar' where message like 'pgtap erro%' $$,
  'the coordinator handles feedback'
);
select is(
  (select status::text from public.feedback_reports where message like 'pgtap erro%'),
  'seen',
  'the status change is kept'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","email":"inactive@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.feedback_reports (kind, message) values ('bug', 'pgtap de inativo') $$,
  '42501', null,
  'an inactive profile cannot send feedback'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- Maintenance requests and maintainers.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ update public.profiles set is_maintainer = true where id = '00000000-0000-0000-0000-000000000102' $$,
  'a researcher update of the maintainer flag is silently ignored'
);
select is(
  (select is_maintainer from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  false,
  'a researcher cannot make themselves a maintainer'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ update public.profiles set is_maintainer = true where id = '00000000-0000-0000-0000-000000000103' $$,
  'a coordinator marks a maintainer'
);
select is(
  (select is_maintainer from public.profiles where id = '00000000-0000-0000-0000-000000000103'),
  true,
  'the maintainer flag is kept'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, urgency) values ('20000000-0000-0000-0000-000000000003', 'pgtap bico entupido', 'normal') $$,
  'any active user reports a problem with an equipment'
);
select throws_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, requested_by) values ('20000000-0000-0000-0000-000000000003', 'pgtap em nome de outro', '00000000-0000-0000-0000-000000000101') $$,
  '42501', null,
  'a request cannot be opened in someone else name'
);
select throws_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, status) values ('20000000-0000-0000-0000-000000000003', 'pgtap ja resolvido', 'resolved') $$,
  '42501', null,
  'a request always starts open'
);
select throws_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap bico entupido'), 'in_progress') $$,
  'P0001', 'maintainer_required',
  'a researcher cannot take a request'
);
select is(
  (select count(*) from public.maintenance_requests where description like 'pgtap%'),
  1::bigint,
  'any active user reads the requests'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap bico entupido'), 'in_progress') $$,
  'a maintainer takes the request'
);
select is(
  (select status::text || ':' || (assigned_to = '00000000-0000-0000-0000-000000000103')::text from public.maintenance_requests where description = 'pgtap bico entupido'),
  'in_progress:true',
  'the request is in progress and assigned to the maintainer'
);
select throws_ok(
  $$ select public.start_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Limpeza do bico') $$,
  'P0001', 'maintenance_already_open',
  'taking the request already put the equipment in maintenance'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'maintenance', 'the equipment is in maintenance');
select lives_ok(
  $$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'Bico limpo') $$,
  'a maintainer releases the equipment'
);
select is(
  (select status::text from public.maintenance_requests where description = 'pgtap bico entupido'),
  'resolved',
  'releasing the equipment resolves the request being worked on'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description) values ('20000000-0000-0000-0000-000000000003', 'pgtap segundo problema') $$,
  'a second request is opened'
);
select lives_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap segundo problema'), 'cancelled') $$,
  'the person who opened a request cancels it while it is open'
);
select is(
  (select status::text from public.maintenance_requests where description = 'pgtap segundo problema'),
  'cancelled',
  'the request is cancelled'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap segundo problema'), 'open') $$,
  'P0001', 'invalid_request_transition',
  'a cancelled request cannot be reopened'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description) values ('20000000-0000-0000-0000-000000000003', 'pgtap terceiro problema') $$,
  'a third request is opened'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap terceiro problema'), 'in_progress', null, '00000000-0000-0000-0000-000000000102') $$,
  'P0001', 'invalid_assignee',
  'a request can only be assigned to a maintainer or coordinator'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- Urgent requests block the equipment; photos are limited to three.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, urgency) values ('20000000-0000-0000-0000-000000000003', 'pgtap urgente', 'urgent') $$,
  'a researcher opens an urgent request'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'stopped', 'an urgent request stops the equipment');
select is(
  (select count(*) from public.equipment_maintenance where equipment_id = '20000000-0000-0000-0000-000000000003' and ended_at is null),
  0::bigint,
  'a stopped equipment has no maintenance episode yet'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap urgente'), 'in_progress') $$,
  'a maintainer starts the maintenance of the urgent request'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'maintenance', 'starting the request puts the equipment in maintenance');
select is(
  (select count(*) from public.equipment_maintenance where equipment_id = '20000000-0000-0000-0000-000000000003' and ended_at is null and reason like 'Chamado urgente: pgtap urgente%'),
  1::bigint,
  'the maintenance episode records the urgent request as the reason'
);
select lives_ok($$ select public.end_equipment_maintenance('20000000-0000-0000-0000-000000000003', 'pgtap liberado') $$, 'a coordinator releases the equipment');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, urgency) values ('20000000-0000-0000-0000-000000000003', 'pgtap urgente enganado', 'urgent') $$,
  'a second urgent request is opened'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'stopped', 'the equipment is stopped again');
select lives_ok(
  $$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap urgente enganado'), 'cancelled') $$,
  'the author cancels the urgent request'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'active', 'cancelling the last urgent request brings the equipment back to active');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, urgency) values ('20000000-0000-0000-0000-000000000003', 'pgtap normal sem bloqueio', 'normal') $$,
  'a normal request is opened'
);
select is((select status::text from public.equipment where id = '20000000-0000-0000-0000-000000000003'), 'active', 'a normal request does not block the equipment');
select throws_ok(
  $$ insert into public.maintenance_requests (equipment_id, description, photo_paths) values ('20000000-0000-0000-0000-000000000003', 'pgtap quatro fotos', array['a','b','c','d']) $$,
  '23514', null,
  'a request accepts at most three photos'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- Purchase requests.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok($$ insert into public.projects (id, name) values ('00000000-0000-0000-0000-0000000000c2', 'Compras Alfa') $$, 'a coordinator creates a project for the purchase tests');
select lives_ok(
  $$ select public.replace_project_members('00000000-0000-0000-0000-0000000000c2', array['00000000-0000-0000-0000-000000000102']::uuid[]) $$,
  'the researcher joins the project'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, url, quantity, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap bico', 'https://exemplo.com/bico', 2, 120.50) $$,
  'a project member requests a purchase'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, requested_by) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap em nome de outro', 10, '00000000-0000-0000-0000-000000000101') $$,
  '42501', null,
  'a purchase cannot be requested in someone else name'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, status) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap ja aprovado', 10, 'approved') $$,
  '42501', null,
  'a purchase request always starts as requested'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, url, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap link ruim', 'javascript:alert(1)', 10) $$,
  '23514', null,
  'only http and https links are accepted'
);
select throws_ok(
  $$ insert into public.purchase_requests (project_id, item, estimated_amount) values ('00000000-0000-0000-0000-0000000000c2', 'pgtap sem rubrica', 10) $$,
  '42501', null,
  'a purchase request needs a funding category'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('bolsas', '00000000-0000-0000-0000-0000000000c2', 'pgtap bolsa', 10) $$,
  '23514', null,
  'scholarships are not a purchase funding category'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap valor negativo', -5) $$,
  '23514', null,
  'the estimated amount cannot be negative'
);
select is((select count(*) from public.purchase_requests where item like 'pgtap%'), 1::bigint, 'the author reads the request');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap de fora', 10) $$,
  '42501', null,
  'someone outside the project cannot request a purchase for it'
);
select is((select count(*) from public.purchase_requests where item like 'pgtap%'), 1::bigint, 'someone outside the project can see the request (read-only)');
select throws_ok(
  $$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'approved') $$,
  'P0001', 'coordinator_required',
  'someone outside the project cannot decide the purchase they can see'
);
select throws_ok(
  $$ select public.update_purchase_request((select id from public.purchase_requests where item = 'pgtap bico'), 'pgtap alterado', null, 1, 1) $$,
  'P0001',
  null,
  'someone outside the project cannot edit the purchase they can see'
);
select is(
  (select name from public.get_purchase_project_names(array['00000000-0000-0000-0000-0000000000c2'::uuid])),
  'Compras Alfa',
  'the project name of a visible purchase is available to everyone'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.update_purchase_request((select id from public.purchase_requests where item = 'pgtap bico'), 'pgtap bico', 'https://exemplo.com/bico', 3, 150, 'urgente', 'capital') $$,
  'the author edits the request while it is waiting'
);
select is((select funding_category::text from public.purchase_requests where item = 'pgtap bico'), 'capital', 'the author changes the funding category');
select throws_ok(
  $$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'approved') $$,
  'P0001', 'coordinator_required',
  'the author cannot approve their own request'
);
select throws_ok(
  $$ update public.purchase_requests set status = 'approved' $$,
  '42501', null,
  'status cannot be changed with a direct update'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'approved') $$, 'the coordinator approves');
select is((select status::text from public.purchase_requests where item = 'pgtap bico'), 'approved', 'the request is approved');
select throws_ok(
  $$ select public.update_purchase_request((select id from public.purchase_requests where item = 'pgtap bico'), 'pgtap bico', null, 1, 1) $$,
  'P0001', 'purchase_not_editable',
  'an approved request cannot be edited'
);
select throws_ok(
  $$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'delivered') $$,
  'P0001', 'invalid_purchase_transition',
  'a request cannot be delivered before being purchased'
);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'purchased', null, 110) $$, 'the coordinator marks it as purchased');
select is((select actual_amount from public.purchase_requests where item = 'pgtap bico'), 110.00::numeric, 'the amount paid is recorded');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'delivered') $$, 'the coordinator marks it as delivered');
select throws_ok(
  $$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'cancelled') $$,
  'P0001', 'invalid_purchase_transition',
  'a delivered request is final'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap cancelar', 20) $$,
  'a second request is opened'
);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap cancelar'), 'cancelled') $$, 'the author cancels while it is waiting');
select is((select status::text from public.purchase_requests where item = 'pgtap cancelar'), 'cancelled', 'the request is cancelled');
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap recusar', 30) $$,
  'a third request is opened'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap recusar'), 'rejected', 'sem verba') $$, 'the coordinator rejects with a reason');
select is((select rejected_reason from public.purchase_requests where item = 'pgtap recusar'), 'sem verba', 'the reason is kept');

select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('passagens', '00000000-0000-0000-0000-0000000000c2', 'pgtap passagem', 800) $$,
  'tickets are a valid funding category for a purchase'
);
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('diarias', '00000000-0000-0000-0000-0000000000c2', 'pgtap diaria', 300) $$,
  'per diems are a valid funding category for a purchase'
);

-- Purchase requests can be stepped back by the coordinator.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'purchased') $$, 'the coordinator undoes a delivery');
select is((select delivered_at is null from public.purchase_requests where item = 'pgtap bico'), true, 'undoing the delivery clears the delivery date');
select is((select actual_amount from public.purchase_requests where item = 'pgtap bico'), 110.00::numeric, 'undoing the delivery keeps the amount paid');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'approved') $$, 'the coordinator undoes a purchase');
select is(
  (select (actual_amount is null and purchased_at is null)::text from public.purchase_requests where item = 'pgtap bico'),
  'true',
  'undoing the purchase clears the amount paid and the purchase date'
);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap bico'), 'requested') $$, 'the coordinator undoes an approval');
select is(
  (select (status = 'requested' and decided_by is null and decided_at is null)::text from public.purchase_requests where item = 'pgtap bico'),
  'true',
  'undoing the approval clears the decision'
);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap cancelar'), 'requested') $$, 'the coordinator reopens a cancelled request');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap recusar'), 'requested') $$, 'the coordinator reopens a rejected request');
select is((select rejected_reason is null from public.purchase_requests where item = 'pgtap recusar'), true, 'reopening clears the rejection reason');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap recusar'), 'approved') $$,
  'P0001', 'coordinator_required',
  'a researcher cannot approve a reopened request'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- Purchase urgency (the coordinator is still the active role here).
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, urgency) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap compra urgente', 10, 'urgent') $$,
  'a purchase can be marked as urgent'
);
select is((select urgency::text from public.purchase_requests where item = 'pgtap compra urgente'), 'urgent', 'the urgency is stored');
select is((select urgency::text from public.purchase_requests where item = 'pgtap bico'), 'normal', 'the urgency defaults to normal');
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, urgency) values ('custeio', '00000000-0000-0000-0000-0000000000c2', 'pgtap urgencia invalida', 10, 'critica') $$,
  '22P02', null,
  'an unknown urgency is rejected'
);
select lives_ok(
  $$ select public.update_purchase_request((select id from public.purchase_requests where item = 'pgtap bico'), 'pgtap bico', null, 1, 1, null, 'capital', 'low') $$,
  'the urgency can be changed while the request is waiting'
);
select is((select urgency::text from public.purchase_requests where item = 'pgtap bico'), 'low', 'the new urgency is kept');

-- Purchase requests for the lab general stock (no project).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', null, 'pgtap estoque geral', 40) $$,
  'someone outside any project requests a purchase for the general stock'
);
select is((select count(*) from public.purchase_requests where item = 'pgtap estoque geral'), 1::bigint, 'the author sees the general stock request');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select is((select count(*) from public.purchase_requests where item = 'pgtap estoque geral'), 1::bigint, 'everyone sees the general stock request (read-only)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","email":"inactive@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount) values ('custeio', null, 'pgtap inativo', 40) $$,
  '42501', null,
  'an inactive user cannot request for the general stock'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select is((select count(*) from public.purchase_requests where item = 'pgtap estoque geral'), 1::bigint, 'the coordinator sees the general stock request');

-- A request waiting for a decision can be moved to another project or to the general stock.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.update_purchase_request(p_request_id := (select id from public.purchase_requests where item = 'pgtap bico'), p_item := 'pgtap bico', p_url := null, p_quantity := 1, p_estimated_amount := 1, p_set_project := true, p_project_id := null) $$, 'the author moves the request to the general stock');
select is((select project_id is null from public.purchase_requests where item = 'pgtap bico'), true, 'the request is now for the general stock');
select lives_ok($$ select public.update_purchase_request(p_request_id := (select id from public.purchase_requests where item = 'pgtap bico'), p_item := 'pgtap bico', p_url := null, p_quantity := 1, p_estimated_amount := 1, p_set_project := true, p_project_id := '00000000-0000-0000-0000-0000000000c2') $$, 'the author moves it back to a project they belong to');
select is((select project_id from public.purchase_requests where item = 'pgtap bico'), '00000000-0000-0000-0000-0000000000c2'::uuid, 'the request is back in the project');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.update_purchase_request(p_request_id := (select id from public.purchase_requests where item = 'pgtap estoque geral'), p_item := 'pgtap estoque geral', p_url := null, p_quantity := 1, p_estimated_amount := 1, p_set_project := true, p_project_id := '00000000-0000-0000-0000-0000000000c2') $$,
  'P0001', 'project_not_available',
  'a request cannot be moved to a project the author does not belong to'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);

-- A purchase request can be linked to a maintenance request (a part the machine needs).
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, maintenance_request_id) values ('custeio', null, 'pgtap peca do chamado', 90, (select id from public.maintenance_requests where description = 'pgtap terceiro problema')) $$,
  'a purchase request can be linked to a maintenance request'
);
select is(
  (select count(*) from public.purchase_requests where item = 'pgtap peca do chamado' and maintenance_request_id = (select id from public.maintenance_requests where description = 'pgtap terceiro problema')),
  1::bigint,
  'the link to the maintenance request is stored'
);
select throws_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, maintenance_request_id) values ('custeio', null, 'pgtap chamado inexistente', 90, '00000000-0000-0000-0000-00000000ffff') $$,
  '23503', null,
  'a purchase request cannot point to a maintenance request that does not exist'
);

-- Maintenance expense flag.
select is(
  (select for_maintenance from public.purchase_requests where item = 'pgtap peca do chamado'),
  true,
  'a purchase made from a maintenance request is a maintenance expense'
);
select is((select for_maintenance from public.purchase_requests where item = 'pgtap bico'), false, 'a regular purchase is not a maintenance expense by default');
select lives_ok($$ select public.update_purchase_request(p_request_id := (select id from public.purchase_requests where item = 'pgtap bico'), p_item := 'pgtap bico', p_url := null, p_quantity := 1, p_estimated_amount := 1, p_for_maintenance := true) $$, 'a purchase can be marked as a maintenance expense while it waits');
select is((select for_maintenance from public.purchase_requests where item = 'pgtap bico'), true, 'the maintenance mark is kept');
select lives_ok($$ select public.update_purchase_request(p_request_id := (select id from public.purchase_requests where item = 'pgtap peca do chamado'), p_item := 'pgtap peca do chamado', p_url := null, p_quantity := 1, p_estimated_amount := 1, p_for_maintenance := false) $$, 'unmarking a purchase linked to a maintenance request is accepted');
select is(
  (select for_maintenance from public.purchase_requests where item = 'pgtap peca do chamado'),
  true,
  'but a purchase linked to a maintenance request stays a maintenance expense'
);

-- A maintenance request waits for a part while a purchase made from it is bought and not yet delivered.
select lives_ok($$ insert into public.maintenance_requests (equipment_id, description) values ('20000000-0000-0000-0000-000000000003', 'pgtap quinto problema') $$, 'a maintenance request is opened');
select lives_ok($$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress') $$, 'a maintainer takes the request');
select lives_ok(
  $$ insert into public.purchase_requests (funding_category, project_id, item, estimated_amount, maintenance_request_id) values ('custeio', null, 'pgtap peca quinta', 50, (select id from public.maintenance_requests where description = 'pgtap quinto problema')) $$,
  'a part is requested from the maintenance request'
);
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca quinta'), 'approved') $$, 'the part purchase is approved');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress', 'approving the part does not change the maintenance request');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca quinta'), 'purchased') $$, 'the part is bought');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'waiting_part', 'buying the part puts the maintenance request in waiting for a part');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca quinta'), 'approved') $$, 'the purchase is undone');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress', 'undoing the purchase brings the maintenance request back');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca quinta'), 'purchased') $$, 'the part is bought again');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca quinta'), 'delivered') $$, 'the part is delivered');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress', 'delivering the part resumes the maintenance request');
select lives_ok($$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap quinto problema'), 'waiting_part') $$, 'a maintainer sets the request to wait by hand');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'waiting_part', 'the request is waiting for a part');
select lives_ok($$ select public.set_maintenance_request_status((select id from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress') $$, 'a maintainer resumes the request');
select is((select status::text from public.maintenance_requests where description = 'pgtap quinto problema'), 'in_progress', 'the request is in progress again');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca do chamado'), 'approved') $$, 'the part of a request nobody took is approved');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca do chamado'), 'purchased') $$, 'that part is bought');
select is((select status::text from public.maintenance_requests where description = 'pgtap terceiro problema'), 'waiting_part', 'a request nobody took also waits for the part');
select lives_ok($$ select public.set_purchase_status((select id from public.purchase_requests where item = 'pgtap peca do chamado'), 'delivered') $$, 'that part is delivered');
select is((select status::text from public.maintenance_requests where description = 'pgtap terceiro problema'), 'open', 'the request nobody took goes back to open');

-- Notifications: triggers create one row per recipient, each person reads only their own and can only mark them read.
set local role postgres;
select set_config('request.jwt.claims', '', true);
insert into public.feedback_reports (kind, message, created_by)
values ('suggestion', 'pgtap notification feedback', '00000000-0000-0000-0000-000000000102');
select is(
  (select count(*)::int from public.notifications where type = 'feedback_new' and recipient_id = '00000000-0000-0000-0000-000000000101' and params->>'kind' = 'suggestion'),
  1,
  'new feedback notifies the coordinator'
);
select is(
  (select count(*)::int from public.notifications where type = 'feedback_new' and recipient_id = '00000000-0000-0000-0000-000000000102'),
  0,
  'new feedback does not notify its author'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.notifications where recipient_id = '00000000-0000-0000-0000-000000000101'),
  0,
  'a user cannot read another person''s notifications'
);
select throws_ok(
  $$ insert into public.notifications (recipient_id, type) values ('00000000-0000-0000-0000-000000000103', 'feedback_new') $$,
  '42501',
  null,
  'clients cannot insert notifications'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","email":"coord@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ update public.notifications set read_at = now() where type = 'feedback_new' $$,
  'a user marks their own notifications as read'
);
select throws_ok(
  $$ update public.notifications set type = 'purchase_new' where recipient_id = '00000000-0000-0000-0000-000000000101' $$,
  '42501',
  null,
  'only read_at can be changed on a notification'
);

-- Push subscriptions: each person sees only their own, and registering an endpoint on a shared browser moves it to the new owner.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.register_push_subscription('https://push.example.org/send/pgtap-endpoint', 'BPpgtapP256dhKeyValue', 'pgtapAuthSecret1', 'pgtap agent') $$,
  'an active user registers a push subscription'
);
select is(
  (select count(*)::int from public.push_subscriptions where endpoint = 'https://push.example.org/send/pgtap-endpoint'),
  1,
  'the owner reads their push subscription'
);
select throws_ok(
  $$ select public.register_push_subscription('http://insecure.example.org/x', 'BPpgtapP256dhKeyValue', 'pgtapAuthSecret1') $$,
  '23514',
  null,
  'push endpoints must be https'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'a user cannot read another person''s push subscriptions'
);
select lives_ok(
  $$ select public.register_push_subscription('https://push.example.org/send/pgtap-endpoint', 'BPpgtapP256dhKeyValue', 'pgtapAuthSecret1', 'pgtap agent') $$,
  'registering the same endpoint again reassigns it'
);
select throws_ok(
  $$ select secret from private.push_config $$,
  '42501',
  null,
  'clients cannot read the push webhook secret'
);

-- Notification preferences: stored per person, hidden from others, and honoured when notifications are created.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.notification_preferences (profile_id, topic, in_app, push) values ('00000000-0000-0000-0000-000000000102', 'bookings', false, false) $$,
  'a user saves their own notification preference'
);
select throws_ok(
  $$ update public.notification_preferences set topic = 'purchases' where topic = 'bookings' $$,
  '42501',
  null,
  'only in_app and push can be changed on a preference'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.notification_preferences),
  0,
  'a user cannot read another person''s notification preferences'
);
set local role postgres;
select set_config('request.jwt.claims', '', true);
select private.notify('00000000-0000-0000-0000-000000000102', 'booking_approved', '{"project":"pgtap prefs"}'::jsonb, '/reservas/minhas', null);
select private.notify('00000000-0000-0000-0000-000000000102', 'feedback_new', '{"kind":"pgtap-pref"}'::jsonb, '/feedback', null);
select is(
  (select count(*)::int from public.notifications where recipient_id = '00000000-0000-0000-0000-000000000102' and params->>'project' = 'pgtap prefs'),
  0,
  'a topic switched off in the panel creates no notification'
);
select is(
  (select count(*)::int from public.notifications where recipient_id = '00000000-0000-0000-0000-000000000102' and params->>'kind' = 'pgtap-pref'),
  1,
  'topics without a saved preference are still delivered'
);

-- Who is told about requests and purchases: new ones reach only coordinators; status changes reach only who opened them.
set local role postgres;
select set_config('request.jwt.claims', '', true);
update public.profiles set is_maintainer = true where id = '00000000-0000-0000-0000-000000000103';
insert into public.maintenance_requests (equipment_id, requested_by, description)
values ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000102', 'pgtap chamado avisos');
select is(
  (select count(*)::int from public.notifications where type = 'request_new' and recipient_id = '00000000-0000-0000-0000-000000000101'
     and entity_id = (select id from public.maintenance_requests where description = 'pgtap chamado avisos')),
  1,
  'a new maintenance request notifies the coordinator'
);
select is(
  (select count(*)::int from public.notifications where type = 'request_new' and recipient_id = '00000000-0000-0000-0000-000000000103'
     and entity_id = (select id from public.maintenance_requests where description = 'pgtap chamado avisos')),
  1,
  'a new maintenance request also notifies maintainers'
);
update public.maintenance_requests set status = 'in_progress' where description = 'pgtap chamado avisos';
select is(
  (select count(*)::int from public.notifications where type = 'request_status' and recipient_id = '00000000-0000-0000-0000-000000000102'
     and params->>'status' = 'in_progress'
     and entity_id = (select id from public.maintenance_requests where description = 'pgtap chamado avisos')),
  1,
  'a status change on a maintenance request notifies who opened it'
);
insert into public.purchase_requests (funding_category, item, estimated_amount, requested_by)
values ('custeio', 'pgtap pedido avisos', 10, '00000000-0000-0000-0000-000000000102');
select is(
  (select count(*)::int from public.notifications where type = 'purchase_new' and recipient_id = '00000000-0000-0000-0000-000000000102'
     and entity_id = (select id from public.purchase_requests where item = 'pgtap pedido avisos')),
  0,
  'a new purchase request does not notify the person who made it'
);
update public.purchase_requests set status = 'cancelled' where item = 'pgtap pedido avisos';
select is(
  (select count(*)::int from public.notifications where type = 'purchase_status' and recipient_id = '00000000-0000-0000-0000-000000000102'
     and params->>'status' = 'cancelled'
     and entity_id = (select id from public.purchase_requests where item = 'pgtap pedido avisos')),
  1,
  'any status change on a purchase notifies who requested it'
);

-- Project join requests: anyone active asks, members and coordinators decide, and the notifications follow.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","email":"other@example.com","role":"authenticated"}', true);
select lives_ok(
  $$ select public.request_project_join('00000000-0000-0000-0000-0000000000c2', 'quero ajudar') $$,
  'a researcher outside the project asks to join it'
);
select throws_ok(
  $$ select public.request_project_join('00000000-0000-0000-0000-0000000000c2') $$,
  'P0001', 'request_already_pending',
  'a second pending request for the same project is refused'
);
select is(
  (select my_request_status::text from public.list_project_directory('00000000-0000-0000-0000-0000000000c2')),
  'pending',
  'the directory shows the person their pending request'
);
select throws_ok(
  $$ select public.decide_project_join_request((select id from public.project_join_requests where message = 'quero ajudar'), true) $$,
  'P0001', 'not_allowed',
  'someone outside the project cannot decide its join requests'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","email":"researcher@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ select public.request_project_join('00000000-0000-0000-0000-0000000000c2') $$,
  'P0001', 'already_member',
  'a member cannot ask to join their own project'
);
select lives_ok(
  $$ select public.decide_project_join_request((select id from public.project_join_requests where message = 'quero ajudar'), true) $$,
  'a project member approves the request'
);
set local role postgres;
select set_config('request.jwt.claims', '', true);
select is(
  (select count(*)::int from public.project_members where project_id = '00000000-0000-0000-0000-0000000000c2' and profile_id = '00000000-0000-0000-0000-000000000103'),
  1,
  'approving adds the person to the project'
);
select is(
  (select count(*)::int from public.notifications where type = 'project_join_request' and recipient_id = '00000000-0000-0000-0000-000000000101'
     and entity_id = (select id from public.project_join_requests where message = 'quero ajudar')),
  1,
  'the coordinator is told about the join request'
);
select is(
  (select count(*)::int from public.notifications where type = 'project_join_request' and recipient_id = '00000000-0000-0000-0000-000000000102'
     and entity_id = (select id from public.project_join_requests where message = 'quero ajudar')),
  1,
  'project members are told about the join request'
);
select is(
  (select count(*)::int from public.notifications where type = 'project_join_decision' and recipient_id = '00000000-0000-0000-0000-000000000103'
     and params->>'approved' = 'true'),
  1,
  'the requester is told about the decision'
);

select * from finish();
rollback;
