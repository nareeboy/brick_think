-- supabase/migrations/20260522110000_seed_site_admin.sql
-- Promotes the configured site-admin account(s) so the /app/admin surface
-- becomes reachable for them.
--
-- Admin emails are sourced from the `app.site_admin_emails` database setting
-- (a comma-separated list), NOT hardcoded — so a fork/self-host designates its
-- own admins. Set it once per environment (Supabase SQL editor or local psql):
--
--   alter database postgres set app.site_admin_emails = 'you@example.com,teammate@example.com';
--
-- When the setting is unset/empty this is a no-op (zero rows promoted), which
-- is the correct default for a fresh clone.
--
-- Idempotent: the UPDATE matches zero rows if no configured profile exists yet
-- (e.g. fresh `pnpm db:reset` before the admin has signed in locally — sign in
-- once to seed the profile via handle_new_user, then re-run). On remote, the
-- profile already exists and the UPDATE flips the flag. The data-driven
-- allowlist + trigger added in 20260606090000 makes promotion
-- order-independent regardless.

update public.profiles p
set is_site_admin = true
from (
  select trim(email) as email
  from regexp_split_to_table(
    coalesce(current_setting('app.site_admin_emails', true), ''),
    ','
  ) as email
  where trim(email) <> ''
) as admins
where p.email = admins.email::citext
  and p.is_site_admin is distinct from true;
