-- supabase/migrations/20260522100000_articles_and_site_admin.sql
-- Introduces:
--   1. A global site-admin role via `profiles.is_site_admin` (default false).
--      Distinct from `is_org_admin(p_org_id)` — that one is scoped to a single
--      org's membership row; this one gates a future `/app/admin` surface used
--      to manage content that applies to the whole site (CMS, etc.).
--   2. A `public.articles` table backing the admin CMS. Authors are tracked
--      via `author_profile_id` so the public reader can attribute posts and
--      the admin list can show "who wrote this".
--   3. RLS — anyone (incl. anon) can read `published` articles so the future
--      public `/articles` page can fetch directly with the anon key; only
--      site admins can read drafts or write at all.
--   4. A public `article-covers` Storage bucket following the four-policy
--      avatars pattern (read/insert/update/delete). Each admin uploads under
--      `<auth.uid()>/<filename>` so the storage RLS gates ownership of the
--      folder, mirroring the convention in 20260517100000_avatars_bucket.sql.
--
-- Idempotent — every statement can re-run safely (matches the project's
-- out-of-band-safe migration convention).

-- 1. Site-admin flag on profiles
alter table public.profiles
  add column if not exists is_site_admin boolean not null default false;

-- Helper: is the calling user a site admin? Stable + security definer so it
-- can be called from RLS policies on tables the caller can't otherwise see
-- (parallels `public.is_org_admin`).
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_site_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_site_admin() to authenticated, anon;

-- 2. Articles table
do $$ begin
  if not exists (select 1 from pg_type where typname = 'article_status') then
    create type public.article_status as enum ('draft', 'published');
  end if;
end $$;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 1 and 120),
  title text not null check (length(title) between 1 and 200),
  excerpt text check (excerpt is null or length(excerpt) <= 400),
  body_markdown text not null default '' check (length(body_markdown) <= 200000),
  cover_image_path text check (cover_image_path is null or length(cover_image_path) <= 512),
  status public.article_status not null default 'draft',
  published_at timestamptz,
  author_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc);
create index if not exists articles_author_idx
  on public.articles (author_profile_id);

-- updated_at trigger
create or replace function public.articles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.articles_set_updated_at();

-- 3. RLS — public read of published; site-admin full access
alter table public.articles enable row level security;

drop policy if exists "Articles: public read of published" on public.articles;
drop policy if exists "Articles: admin read drafts" on public.articles;
drop policy if exists "Articles: admin write" on public.articles;

create policy "Articles: public read of published"
  on public.articles for select
  using (status = 'published');

create policy "Articles: admin read drafts"
  on public.articles for select to authenticated
  using (public.is_site_admin());

create policy "Articles: admin write"
  on public.articles for all to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- 4. Storage bucket for article cover images
insert into storage.buckets (id, name, public)
values ('article-covers', 'article-covers', true)
on conflict (id) do nothing;

drop policy if exists "Article covers: public read"     on storage.objects;
drop policy if exists "Article covers: admin read"      on storage.objects;
drop policy if exists "Article covers: admin insert"    on storage.objects;
drop policy if exists "Article covers: admin update"    on storage.objects;
drop policy if exists "Article covers: admin delete"    on storage.objects;

-- Public read on the bucket flag covers anonymous HTTP GET for rendering, but
-- the Supabase storage server still issues an authenticated SELECT internally
-- when an admin calls upload(..., { upsert: true }) — without an explicit
-- SELECT policy for authenticated users that upsert silently fails. Same
-- gotcha as the avatars bucket.
create policy "Article covers: admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'article-covers'
    and public.is_site_admin()
  );

create policy "Article covers: admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'article-covers'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Article covers: admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'article-covers'
    and public.is_site_admin()
  )
  with check (
    bucket_id = 'article-covers'
    and public.is_site_admin()
  );

create policy "Article covers: admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'article-covers'
    and public.is_site_admin()
  );
