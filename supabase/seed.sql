-- supabase/seed.sql
-- Local-only development seed. Runs automatically after migrations
-- when you call `supabase db reset` or `pnpm db:reset`.
-- Do not put production data here. Catalog rows belong in migrations.

-- (Phase 0 leaves this empty. Step 4 will add a sample dev user
-- workflow once the auth flow is live.)

-- Restore Supabase's historical public-schema grants.
--
-- Recent Supabase Postgres images narrowed the default privileges on `public`
-- to Dxtm (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) for anon, authenticated and
-- service_role — no SELECT/INSERT/UPDATE/DELETE. Our migrations contain no
-- GRANT statements and rely entirely on those inherited defaults, so on a
-- freshly created local DB every table in `public` ends up unreadable and any
-- query fails with `permission denied for table <name>`.
--
-- The remote projects were provisioned under the old permissive defaults and
-- already have these grants, so this only re-aligns local with remote. RLS is
-- untouched and remains the actual row-level boundary.
--
-- Local-only on purpose: `supabase db push` never ships seed.sql. If the two
-- environments ever need to converge, move this into a migration instead.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
