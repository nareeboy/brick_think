-- supabase/migrations/20260612100000_changelog_release_category.sql
-- Add 'release' to the changelog category CHECK. Drops the existing inline
-- check (auto-named changelog_entries_category_check by Postgres) and re-adds
-- it with the expanded allow-list under a stable name.
--
-- Idempotent — drop-if-exists then add can re-run safely.

alter table public.changelog_entries
  drop constraint if exists changelog_entries_category_check;

alter table public.changelog_entries
  add constraint changelog_entries_category_check
  check (category in ('feature', 'improvement', 'fix', 'breaking', 'release'));

-- Rollback (reference only):
--   alter table public.changelog_entries drop constraint if exists changelog_entries_category_check;
--   alter table public.changelog_entries
--     add constraint changelog_entries_category_check
--     check (category in ('feature', 'improvement', 'fix', 'breaking'));
