-- supabase/migrations/20260606090000_site_admin_self_healing.sql
--
-- Makes site-admin promotion order-independent.
--
-- Problem this fixes: the original one-shot seed
-- (20260522110000_seed_site_admin.sql) is `UPDATE profiles SET is_site_admin
-- WHERE email = '<maintainer>'`. On a fresh `pnpm db:reset` it runs BEFORE the
-- maintainer has ever signed in, so no profile row exists yet, the UPDATE
-- matches zero rows, and is a silent no-op. The maintainer then signs in,
-- `handle_new_user` creates the profile with the default `is_site_admin =
-- false`, and nothing ever flips it back. Result: the local admin surface is
-- invisible until someone manually re-runs the UPDATE.
--
-- Fix: a data-driven allowlist (`public.site_admin_emails`) plus a BEFORE
-- INSERT/UPDATE trigger on `public.profiles` that promotes any profile whose
-- email is on the allowlist — at the moment the row is created or its email
-- changes, regardless of whether the seed ran first. Promotion only ever sets
-- the flag true; it never demotes, so manual grants and the legacy seed both
-- survive. Adding a future admin is a one-row insert into the allowlist, not a
-- function edit.
--
-- Fully idempotent: safe on a fresh `pnpm db:reset` and as a no-op re-apply
-- against an already-migrated remote.

-- ── 1. Allowlist table ──────────────────────────────────────────────────────
-- Single source of truth for "which emails are site admins". citext so the
-- match is case-insensitive and aligned with profiles.email (also citext).

create table if not exists public.site_admin_emails (
  email citext primary key,
  added_at timestamptz not null default now()
);

-- Private table: enable RLS with NO policies → default-deny for anon /
-- authenticated (clients must never enumerate who the admins are). The trigger
-- below is SECURITY DEFINER and the service-role client bypasses RLS, so both
-- legitimate read paths still work. Mirrors the zero-policy default-deny
-- pattern used by the session-reports storage bucket.
alter table public.site_admin_emails enable row level security;

-- Seed the configured admin emails from the `app.site_admin_emails` database
-- setting (a comma-separated list) — NOT hardcoded, so a fork/self-host sets
-- its own admins once per environment (Supabase SQL editor or local psql):
--
--   alter database postgres set app.site_admin_emails = 'you@example.com,teammate@example.com';
--
-- Unset/empty setting → zero rows inserted (correct default for a fresh clone).
insert into public.site_admin_emails (email)
select trim(email)::citext
from regexp_split_to_table(
  coalesce(current_setting('app.site_admin_emails', true), ''),
  ','
) as email
where trim(email) <> ''
on conflict (email) do nothing;

-- ── 2. Promotion trigger ────────────────────────────────────────────────────
-- Promote-only: the flag is forced true when the email is on the allowlist,
-- but an already-true flag (manual grant, legacy seed) is preserved. Never
-- demotes — removing an email from the allowlist does not strip an existing
-- admin (do that deliberately with an explicit UPDATE if ever needed).

create or replace function public.sync_site_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_site_admin := coalesce(new.is_site_admin, false)
    or exists (
      select 1 from public.site_admin_emails a where a.email = new.email
    );
  return new;
end;
$$;

drop trigger if exists trg_sync_site_admin_flag on public.profiles;
create trigger trg_sync_site_admin_flag
  before insert or update of email on public.profiles
  for each row
  execute function public.sync_site_admin_flag();

-- ── 3. Backfill existing rows ───────────────────────────────────────────────
-- Heals any profile that already exists with the flag still false (i.e. the
-- exact state the ordering bug leaves behind). `is distinct from true` so the
-- write is skipped when the flag is already set.

update public.profiles p
set is_site_admin = true
from public.site_admin_emails a
where a.email = p.email
  and p.is_site_admin is distinct from true;
