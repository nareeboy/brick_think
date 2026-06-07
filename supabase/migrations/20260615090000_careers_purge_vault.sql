-- supabase/migrations/20260615090000_careers_purge_vault.sql
-- Fix the careers CV purge: read its target URL + shared secret from Supabase
-- Vault instead of `app.*` database GUCs.
--
-- Why: the original purge (20260605090000_careers.sql) read
-- `current_setting('app.careers_purge_url')` / `app.careers_cron_secret`, set
-- via `alter database postgres set app.* = ...`. But the `postgres` role on
-- Supabase — cloud AND the local CLI stack — is not a superuser and cannot
-- persist custom GUCs (`ALTER DATABASE/ROLE ... SET app.*` → 42501). So the
-- settings were always empty, `trigger_careers_purge()` hit its "skipped"
-- branch every night, and applicant CVs were never deleted at the 7-day mark.
--
-- Supabase Vault works where GUCs don't: the `postgres` role can write secrets,
-- and a SECURITY DEFINER function (owned by postgres) can read them back via
-- `vault.decrypted_secrets`.
--
-- Set the two secrets ONCE per environment (Supabase SQL editor / local psql):
--   select vault.create_secret('https://<web-host>/api/careers/purge-expired', 'careers_purge_url');
--   select vault.create_secret('<openssl rand -hex 32>', 'careers_cron_secret');
-- Rotate later with vault.update_secret(<uuid>, '<new value>'). The matching
-- CAREERS_CRON_SECRET env on the web service must equal careers_cron_secret.
-- If either secret is missing the function no-ops (safe default), so the sweep
-- simply doesn't fire until both are present.

create extension if not exists supabase_vault with schema vault;

create or replace function public.trigger_careers_purge()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'careers_purge_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'careers_cron_secret';

  if v_url is null or v_secret is null or length(v_url) = 0 or length(v_secret) = 0 then
    raise notice 'careers purge skipped: careers_purge_url / careers_cron_secret not in vault';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.trigger_careers_purge() from public;

-- The pg_cron job 'trigger-careers-purge' (daily 04:11 UTC) from
-- 20260605090000_careers.sql is unchanged — it already calls this function; we
-- only swapped the function body's secret source.
