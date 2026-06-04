-- supabase/migrations/20260605090000_careers.sql
-- Careers: admin-managed role postings + anonymous applications with CV upload.
--
--   1. careers_roles — postings managed in /app/admin/careers/roles.
--      anon + authenticated may read only OPEN roles (public /careers list);
--      site admins have full read/write (mirrors the articles RLS shape).
--   2. careers_applications — one row per submission. NO anon/authenticated
--      access at all; inserts happen via the service_role submission route,
--      which bypasses RLS. Only site admins can read/update/delete.
--   3. Private `careers-cv` Storage bucket (public=false). No anon/auth
--      storage policies — service_role handles upload; admin downloads via
--      service_role-minted signed URLs.
--   4. expires_at (created_at + 7 days) + a daily pg_cron job that calls
--      pg_net → the app's secret-guarded purge route, which deletes the
--      physical CV files (Storage API) and the rows.
--
-- Idempotent — every statement can re-run safely.

-- 1. Roles table -----------------------------------------------------------
create table if not exists public.careers_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 120),
  title text not null check (length(title) between 1 and 200),
  location text not null default '' check (length(location) <= 120),
  employment_type text not null default '' check (length(employment_type) <= 80),
  summary text not null default '' check (length(summary) <= 400),
  description_markdown text not null default '' check (length(description_markdown) <= 200000),
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists careers_roles_open_idx
  on public.careers_roles (is_open, created_at desc);

create or replace function public.careers_roles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists careers_roles_updated_at on public.careers_roles;
create trigger careers_roles_updated_at
  before update on public.careers_roles
  for each row execute function public.careers_roles_set_updated_at();

-- 2. Applications table ----------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'careers_application_status') then
    create type public.careers_application_status
      as enum ('new', 'reviewed', 'shortlisted', 'rejected');
  end if;
end $$;

create table if not exists public.careers_applications (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references public.careers_roles(id) on delete set null,
  first_name text not null check (length(first_name) between 1 and 120),
  last_name text not null check (length(last_name) between 1 and 120),
  address text not null check (length(address) between 1 and 2000),
  phone text not null check (length(phone) between 3 and 40),
  linkedin_url text not null check (length(linkedin_url) between 1 and 2000),
  cv_path text check (cv_path is null or length(cv_path) <= 512),
  cv_filename text check (cv_filename is null or length(cv_filename) <= 255),
  status public.careers_application_status not null default 'new',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists careers_applications_role_idx
  on public.careers_applications (role_id);
create index if not exists careers_applications_expires_idx
  on public.careers_applications (expires_at);
create index if not exists careers_applications_created_idx
  on public.careers_applications (created_at desc);

-- 3. RLS -------------------------------------------------------------------
alter table public.careers_roles enable row level security;
alter table public.careers_applications enable row level security;

-- Roles: anyone reads OPEN roles; site admins do everything.
drop policy if exists "careers_roles: read open" on public.careers_roles;
create policy "careers_roles: read open"
  on public.careers_roles for select
  to anon, authenticated
  using (is_open = true or public.is_site_admin());

drop policy if exists "careers_roles: admin write" on public.careers_roles;
create policy "careers_roles: admin write"
  on public.careers_roles for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Applications: ONLY site admins (read/update/delete). No insert policy ->
-- anon/authenticated inserts are denied; the service_role route bypasses RLS.
drop policy if exists "careers_applications: admin read" on public.careers_applications;
create policy "careers_applications: admin read"
  on public.careers_applications for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "careers_applications: admin update" on public.careers_applications;
create policy "careers_applications: admin update"
  on public.careers_applications for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "careers_applications: admin delete" on public.careers_applications;
create policy "careers_applications: admin delete"
  on public.careers_applications for delete
  to authenticated
  using (public.is_site_admin());

-- 4. Private CV bucket -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('careers-cv', 'careers-cv', false)
on conflict (id) do nothing;

-- Site admins may read CV objects directly (belt-and-braces; downloads use
-- service_role signed URLs, but this lets an admin-context client list too).
drop policy if exists "careers-cv: admin read" on storage.objects;
create policy "careers-cv: admin read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'careers-cv' and public.is_site_admin());

-- No anon/authenticated insert/update/delete policies: uploads + deletes are
-- service_role only.

-- 5. Purge: pg_cron -> pg_net -> app purge route ---------------------------
create extension if not exists pg_net with schema extensions;

-- Reads the per-environment target URL + shared secret from database GUCs so
-- no secret is committed. Set them out-of-band per environment (see plan /
-- supabase/CLAUDE.md):
--   alter database postgres set app.careers_purge_url = 'https://<host>/api/careers/purge-expired';
--   alter database postgres set app.careers_cron_secret = '<random hex>';
create or replace function public.trigger_careers_purge()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text := current_setting('app.careers_purge_url', true);
  v_secret text := current_setting('app.careers_cron_secret', true);
begin
  if v_url is null or v_secret is null or length(v_url) = 0 or length(v_secret) = 0 then
    raise notice 'careers purge skipped: app.careers_purge_url / app.careers_cron_secret not set';
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

-- pg_cron is already enabled (20260513000000_models_soft_delete.sql).
-- Daily at 04:11 UTC — offset from the existing 03:17 / 03:43 jobs.
do $$
begin
  perform cron.unschedule('trigger-careers-purge')
  where exists (select 1 from cron.job where jobname = 'trigger-careers-purge');
exception when others then
  null;
end $$;

select cron.schedule(
  'trigger-careers-purge',
  '11 4 * * *',
  $$select public.trigger_careers_purge();$$
);

-- Rollback (reference only):
--   select cron.unschedule('trigger-careers-purge');
--   drop function public.trigger_careers_purge();
--   drop table public.careers_applications;
--   drop type public.careers_application_status;
--   drop table public.careers_roles;
--   delete from storage.buckets where id = 'careers-cv';
