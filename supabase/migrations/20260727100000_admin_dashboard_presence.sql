-- Admin dashboard: presence heartbeat + online-count sampling.
--
-- profile_presence is a separate table (not a column on profiles) so the
-- existing profile-read policies (org co-members can read each other's
-- profiles) never expose last-seen times, and 2-minute heartbeats don't
-- churn profiles.updated_at. All writes go through touch_presence();
-- only site admins can read.
--
-- online_user_samples holds one row per 5-minute pg_cron snapshot of the
-- concurrent-online count ("online" = seen within the last 5 minutes).
-- pg_cron is already enabled (20260513000000_models_soft_delete.sql).

create table public.profile_presence (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.profile_presence enable row level security;

create policy "Site admins can read presence"
  on public.profile_presence for select
  using (public.is_site_admin());

-- No INSERT/UPDATE/DELETE policies: the RPC below is the only write path.

create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = public
as $fn$
  insert into public.profile_presence (profile_id, last_seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (profile_id) do update set last_seen_at = now();
$fn$;

revoke execute on function public.touch_presence() from public;
revoke execute on function public.touch_presence() from anon;
grant execute on function public.touch_presence() to authenticated;

create table public.online_user_samples (
  sampled_at timestamptz primary key default now(),
  online_count integer not null check (online_count >= 0)
);

alter table public.online_user_samples enable row level security;

create policy "Site admins can read online samples"
  on public.online_user_samples for select
  using (public.is_site_admin());

-- Snapshot the concurrent-online count every 5 minutes. pg_cron jobs run as
-- the `postgres` role, which on hosted Supabase is NOT a superuser — the
-- insert below succeeds because `postgres` OWNS this table, and table owners
-- bypass RLS by default (row_security only applies to non-owners). Do NOT add
-- `force row level security` to this table: that flag makes RLS apply to
-- owners too, and would silently break this cron insert.
select cron.schedule(
  'sample-online-users',
  '*/5 * * * *',
  $job$
    insert into public.online_user_samples (online_count)
    select count(*)::int
    from public.profile_presence
    where last_seen_at > now() - interval '5 minutes'
    on conflict (sampled_at) do nothing
  $job$
);

-- Keep ~13 months of samples (the dashboard's widest range is 90 days).
select cron.schedule(
  'prune-online-user-samples',
  '30 3 * * 0',
  $job$
    delete from public.online_user_samples
    where sampled_at < now() - interval '13 months'
  $job$
);
