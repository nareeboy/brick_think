-- Garbage-collect dead model_share_links rows.
--
-- Closes:
--   docs/superpowers/followups/2026-05-13-public-sharing-links-followups.md
--     #5  model_share_links rows accumulate forever
--
-- Why
-- ---
-- Revoked and expired rows stay in model_share_links forever — intentional
-- for FK integrity and a future audit trail, but at hundreds of users x
-- ~5 active links each the table eventually bloats. Doesn't matter until
-- 1M+ rows in practice, but the cleanup function is cheap to ship
-- alongside the existing purge_expired_trashed_models() pattern.
--
-- A row is "dead" when:
--   • revoked_at IS NOT NULL  (owner clicked Revoke)
--   • OR expires_at IS NOT NULL AND expires_at < now()  (TTL fired)
--
-- 90 days of grace gives anyone debugging "why did this stop working"
-- time to see the row before it disappears, and is consistent with the
-- soft-delete trash retention window (30 days) being shorter — share
-- links are a less-frequently-touched audit surface than trash.

set search_path = public;

create or replace function public.purge_dead_share_links()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.model_share_links
  where (
    (revoked_at is not null and revoked_at < now() - interval '90 days')
    or (
      expires_at is not null
      and expires_at < now() - interval '90 days'
    )
  );
$$;

revoke all on function public.purge_dead_share_links() from public;

-- pg_cron is already enabled (20260513000000_models_soft_delete.sql).
-- Daily at 03:43 UTC — offset from purge_expired_trashed_models()'s
-- 03:17 slot so the two jobs don't pile up on the same minute.
-- Idempotent: cron.unschedule first so re-running the migration
-- doesn't error on a duplicate job name.
do $$
begin
  perform cron.unschedule('purge-dead-share-links')
  where exists (select 1 from cron.job where jobname = 'purge-dead-share-links');
exception when others then
  null;
end $$;

select cron.schedule(
  'purge-dead-share-links',
  '43 3 * * *',
  $$select public.purge_dead_share_links();$$
);

-- Rollback (commented; for reference only):
--   select cron.unschedule('purge-dead-share-links');
--   drop function public.purge_dead_share_links();
