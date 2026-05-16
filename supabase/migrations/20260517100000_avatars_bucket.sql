-- supabase/migrations/20260517100000_avatars_bucket.sql
-- Provisions a public `avatars` Storage bucket with owner-folder RLS on
-- storage.objects. Path convention: '<auth.uid()>/avatar.png' (exactly one
-- object per user, upserted on every upload). Bucket is public so the
-- avatar URL can be rendered with a plain <img src> + ?v=<ts> cache buster,
-- without minting signed URLs on every render (cf. spec
-- docs/superpowers/specs/2026-05-16-profile-avatar-upload-design.md).
--
-- Idempotent — same applied-by-hand pattern as model-thumbnails. Re-running
-- is a no-op.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars: owner can insert" on storage.objects;
drop policy if exists "Avatars: owner can update" on storage.objects;
drop policy if exists "Avatars: owner can delete" on storage.objects;

create policy "Avatars: owner can insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: owner can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: owner can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No SELECT policy needed — bucket.public = true means SELECT on the object
-- via the public URL bypasses RLS.
