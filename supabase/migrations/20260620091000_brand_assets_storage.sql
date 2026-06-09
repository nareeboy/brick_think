-- Private bucket for white-label brand assets: logo PNGs + custom TTF fonts.
-- Owner-folder RLS (path = `${owner_id}/${profile_id}/<asset>`), mirroring the
-- model-thumbnails/avatars idiom. The owner reads their own assets (signed URL
-- for the editor preview); the report renderer reads bytes via service role
-- (bypasses RLS). No public read — these are customer brand assets.

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

drop policy if exists "Brand assets: owner read"   on storage.objects;
drop policy if exists "Brand assets: owner insert" on storage.objects;
drop policy if exists "Brand assets: owner update" on storage.objects;
drop policy if exists "Brand assets: owner delete" on storage.objects;

create policy "Brand assets: owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Brand assets: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Brand assets: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Brand assets: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
