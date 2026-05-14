-- supabase/migrations/20260514130000_thumbnails_org_session_read.sql
-- Broaden storage.objects SELECT on the model-thumbnails bucket so org-mates
-- of an org-shared model AND members of a session-scoped model's parent org
-- can read the thumbnail file. Mirrors the active-SELECT policy on
-- public.models (`"Models: owner, org reader, or session reader can read active"`).
--
-- Path convention from 20260513100000_model_thumbnails.sql is
-- `<owner-auth-uid>/<model_id>.png`. We derive the owner uid from the first
-- folder segment (existing pattern) AND, for non-owner readers, resolve the
-- model_id from the filename and check its visibility on public.models.
--
-- INSERT / UPDATE / DELETE remain owner-only — only the owner regenerates
-- their thumbnails, and write semantics don't widen with org/session reads.

drop policy if exists "Thumbnails: owner can read" on storage.objects;
drop policy if exists "Thumbnails: owner, org reader, or session reader can read"
  on storage.objects;

create policy "Thumbnails: owner, org reader, or session reader can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'model-thumbnails'
    and (
      -- owner branch: matches the legacy policy exactly
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        -- org-mate or session-org-mate branch: resolve the model row by id
        -- from the filename (`<model_id>.<ext>`) and check active-visibility.
        select 1 from public.models m
        where m.id::text = split_part(split_part(name, '/', 2), '.', 1)
          and m.deleted_at is null
          and (
            (m.org_id is not null and public.is_org_member(m.org_id))
            or (
              m.session_id is not null
              and exists (
                select 1 from public.sessions s
                where s.id = m.session_id
                  and public.is_org_member(s.org_id)
              )
            )
          )
      )
    )
  );

-- Rollback (commented; reference only):
--   drop policy "Thumbnails: owner, org reader, or session reader can read" on storage.objects;
--   create policy "Thumbnails: owner can read"
--     on storage.objects for select to authenticated
--     using (
--       bucket_id = 'model-thumbnails'
--       and (storage.foldername(name))[1] = auth.uid()::text
--     );
