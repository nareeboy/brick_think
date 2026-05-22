-- supabase/migrations/20260522110000_seed_site_admin.sql
-- Promotes the maintainer account to site admin so the /app/admin surface
-- becomes reachable for them.
--
-- Idempotent: the UPDATE is a no-op if the profile row doesn't exist yet
-- (e.g. fresh `pnpm db:reset` before the maintainer has signed in locally —
-- in that case, sign in once to seed the profile via handle_new_user, then
-- re-run this migration with `pnpm db:reset` or execute the UPDATE manually
-- against the local Postgres container). On remote, the profile already
-- exists and the UPDATE flips the flag.

update public.profiles
set is_site_admin = true
where email = 'redacted@example.com';
