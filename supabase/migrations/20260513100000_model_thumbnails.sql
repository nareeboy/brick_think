-- supabase/migrations/20260513100000_model_thumbnails.sql
-- Adds thumbnail tracking to public.models and provisions a private
-- model-thumbnails Storage bucket with owner-only RLS on storage.objects.
-- Path convention: '<auth.uid()>/<model_id>.png' (one object per model,
-- upserted on every regeneration). thumbnail_updated_at is the cache buster
-- appended to signed URLs on the list page.
--
-- Written idempotently because the same SQL has already been applied to the
-- remote project by hand. Statements are guarded so re-applying is a no-op.

alter table public.models
  add column if not exists thumbnail_path        text,
  add column if not exists thumbnail_updated_at  timestamptz;

insert into storage.buckets (id, name, public)
values ('model-thumbnails', 'model-thumbnails', false)
on conflict (id) do nothing;

drop policy if exists "Thumbnails: owner can read"   on storage.objects;
drop policy if exists "Thumbnails: owner can insert" on storage.objects;
drop policy if exists "Thumbnails: owner can update" on storage.objects;
drop policy if exists "Thumbnails: owner can delete" on storage.objects;

create policy "Thumbnails: owner can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'model-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Thumbnails: owner can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'model-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Thumbnails: owner can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'model-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'model-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Thumbnails: owner can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'model-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
