-- supabase/migrations/20260612090000_changelog.sql
-- Changelog: admin-managed, single-scrolling public changelog.
--
--   public.changelog_entries — entries managed in /app/admin/changelog.
--     anon + authenticated read PUBLISHED rows only (public /changelog);
--     site admins have full read/write incl. drafts (mirrors the articles
--     RLS shape). Body is sanitized WYSIWYG HTML. category is a fixed enum
--     of label kinds; version_tag is an optional free string (e.g. "v2.4").
--
-- Idempotent — every statement can re-run safely.

create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  body_html text not null default '' check (length(body_html) <= 200000),
  category text not null default 'feature'
    check (category in ('feature', 'improvement', 'fix', 'breaking')),
  version_tag text check (version_tag is null or length(version_tag) between 1 and 40),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A published entry must carry a publish date so the public page can order
  -- and group by it; drafts may have a null date.
  constraint changelog_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

-- Public list orders/filters on (status, published_at desc).
create index if not exists changelog_published_idx
  on public.changelog_entries (status, published_at desc);

create or replace function public.changelog_entries_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists changelog_entries_updated_at on public.changelog_entries;
create trigger changelog_entries_updated_at
  before update on public.changelog_entries
  for each row execute function public.changelog_entries_set_updated_at();

-- RLS ----------------------------------------------------------------------
alter table public.changelog_entries enable row level security;

-- anon + authenticated read PUBLISHED rows; site admins read everything.
drop policy if exists "changelog_entries: read published" on public.changelog_entries;
create policy "changelog_entries: read published"
  on public.changelog_entries for select
  to anon, authenticated
  using (status = 'published' or public.is_site_admin());

-- site admins: full write.
drop policy if exists "changelog_entries: admin write" on public.changelog_entries;
create policy "changelog_entries: admin write"
  on public.changelog_entries for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Rollback (reference only):
--   drop table public.changelog_entries;
--   drop function public.changelog_entries_set_updated_at();
