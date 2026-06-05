-- supabase/migrations/20260614090000_changelog_banners.sql
-- Per-entry banner image for changelog entries.
--
--   public.changelog_entries.banner_image_path — Storage path of an optional
--     banner image rendered above each entry on the public /changelog page.
--   public `changelog-banners` Storage bucket — mirrors the four-policy shape
--     of `article-covers`: bucket public flag covers anonymous HTTP GET for
--     rendering; an explicit authenticated SELECT policy is still required so a
--     site admin's upsert (insert-vs-update probe) doesn't silently fail.
--
-- Idempotent — every statement can re-run safely.

alter table public.changelog_entries
  add column if not exists banner_image_path text;

-- Storage bucket -----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('changelog-banners', 'changelog-banners', true)
on conflict (id) do nothing;

drop policy if exists "Changelog banners: admin read"   on storage.objects;
drop policy if exists "Changelog banners: admin insert" on storage.objects;
drop policy if exists "Changelog banners: admin update" on storage.objects;
drop policy if exists "Changelog banners: admin delete" on storage.objects;

-- Public read happens over the bucket public flag (anon HTTP GET). The Supabase
-- storage server still issues an authenticated SELECT internally when an admin
-- calls upload(..., { upsert: true }); without this policy that upsert silently
-- fails. Same gotcha as the avatars / article-covers buckets.
create policy "Changelog banners: admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'changelog-banners'
    and public.is_site_admin()
  );

create policy "Changelog banners: admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'changelog-banners'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Changelog banners: admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'changelog-banners'
    and public.is_site_admin()
  )
  with check (
    bucket_id = 'changelog-banners'
    and public.is_site_admin()
  );

create policy "Changelog banners: admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'changelog-banners'
    and public.is_site_admin()
  );

-- Rollback (reference only):
--   alter table public.changelog_entries drop column banner_image_path;
--   delete from storage.buckets where id = 'changelog-banners';
