-- supabase/migrations/20260523080000_articles_cover_credit.sql
-- Adds image-attribution columns to public.articles. Storing structured
-- fields (name + URL × photographer/source) rather than the raw HTML that
-- Unsplash/Pexels paste — keeps the render side XSS-safe and lets the
-- public page format the credit consistently:
--
--   Photo by <Photographer> on <Source>
--
-- All four columns are nullable; when only the photographer name is set
-- the credit still renders without the second link. CHECKs cap each field
-- to a sane upper bound (long URLs from CMS query strings are common so
-- 2000 chars is the practical limit).
--
-- Idempotent — re-running on an already-migrated remote is a no-op.

alter table public.articles
  add column if not exists cover_credit_name text
    check (cover_credit_name is null or length(cover_credit_name) <= 120),
  add column if not exists cover_credit_url text
    check (cover_credit_url is null or length(cover_credit_url) <= 2000),
  add column if not exists cover_credit_source text
    check (cover_credit_source is null or length(cover_credit_source) <= 60),
  add column if not exists cover_credit_source_url text
    check (cover_credit_source_url is null or length(cover_credit_source_url) <= 2000);
