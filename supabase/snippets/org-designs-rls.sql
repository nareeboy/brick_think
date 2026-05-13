-- supabase/snippets/org-designs-rls.sql
-- Manual RLS smoke for the org-wide designs migration.
-- Run with:
--   pnpm db:reset && \
--     psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--          -v ON_ERROR_STOP=1 -f supabase/snippets/org-designs-rls.sql
-- Expected: every assertion prints `pass`. Any `fail` is a regression.

begin;

-- Test fixtures: two profiles, one org, Alice owns the org and shares a model;
-- Bob is added as a member; Carol is in no org and must not see Alice's row.
insert into auth.users (id, email, aud, role, instance_id)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
-- public.profiles is auto-populated by the on_auth_user_created trigger.

insert into public.organisations (id, name, slug, owner_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Inc', 'acme-inc', '11111111-1111-1111-1111-111111111111');
-- on_organisation_created trigger inserts Alice's owner membership.

insert into public.org_memberships (org_id, profile_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member');

insert into public.models (id, owner_profile_id, title, org_id)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Shared with Acme', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into public.models (id, owner_profile_id, title)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Alice personal');

-- Helper: switch to authenticated role + impersonate a user.
create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  -- 'role' is the Postgres session-role GUC; set_config switches the active role for the rest of the transaction.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid::text)::text, true);
end;
$$;

create or replace function pg_temp.assert(label text, ok boolean) returns void
language plpgsql as $$
begin
  raise notice '% : %', label, case when ok then 'pass' else 'fail' end;
  if not ok then raise exception 'assertion failed: %', label; end if;
end;
$$;

-- Bob (org-mate) sees the shared model.
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.assert(
  'bob can SELECT shared model',
  exists (select 1 from public.models where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')
);
select pg_temp.assert(
  'bob does NOT see Alice personal model',
  not exists (select 1 from public.models where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')
);
-- Bob cannot UPDATE the shared model.
do $$
declare cnt int;
begin
  update public.models set title = 'hijack' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics cnt = row_count;
  perform pg_temp.assert('bob UPDATE on shared model affects 0 rows', cnt = 0);
end $$;
-- Bob cannot DELETE the shared model.
do $$
declare cnt int;
begin
  delete from public.models where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  get diagnostics cnt = row_count;
  perform pg_temp.assert('bob DELETE on shared model affects 0 rows', cnt = 0);
end $$;

-- Carol (no org) cannot see the shared model.
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.assert(
  'carol does NOT see shared model',
  not exists (select 1 from public.models where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')
);

-- Alice leaves the org — the trigger should NULL out her shared model's org_id.
reset role;
delete from public.org_memberships
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   and profile_id = '11111111-1111-1111-1111-111111111111';

select pg_temp.assert(
  'alice-leaves trigger sets org_id to NULL',
  (select org_id from public.models where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') is null
);

-- Trigger: a profile whose active_org_id pointed at the deleted org is reset.
-- Re-add Alice as owner-by-fixture, set her active_org_id, then remove her.
insert into public.org_memberships (org_id, profile_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner');
update public.profiles
   set active_org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
 where id = '11111111-1111-1111-1111-111111111111';
delete from public.org_memberships
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   and profile_id = '11111111-1111-1111-1111-111111111111';
select pg_temp.assert(
  'alice-leaves trigger clears profiles.active_org_id',
  (select active_org_id from public.profiles where id = '11111111-1111-1111-1111-111111111111') is null
);

rollback;
