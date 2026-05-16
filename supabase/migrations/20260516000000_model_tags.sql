-- supabase/migrations/20260516000000_model_tags.sql
-- Adds a flat tag bag to public.models.
-- Path: docs/superpowers/followups/2026-05-11-persistent-designs-roadmap.md
--       stream #5 (folders, tags, search, sort) — tags first.
--
-- Schema posture:
--   * public.model_tags is keyed (model_id, tag) so tagging is idempotent.
--   * Tag values are constrained to ^[a-z0-9][a-z0-9-]{0,31}$ — same shape
--     the client normalises to in lib/my-designs/types.ts isValidTag().
--   * RLS mirrors public.models: anyone who can SELECT the parent model can
--     SELECT its tags; only the model's owner can INSERT / DELETE tags.
--     There is no UPDATE — to rename a tag, delete and reinsert.
--
-- Written idempotently per CLAUDE.md so a remote that has already had this
-- applied by hand stays a no-op under `pnpm db:push`.

create table if not exists public.model_tags (
  model_id   uuid not null references public.models(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now(),
  primary key (model_id, tag),
  constraint model_tags_tag_format
    check (tag ~ '^[a-z0-9][a-z0-9-]{0,31}$')
);

create index if not exists model_tags_tag_idx
  on public.model_tags (tag);

alter table public.model_tags enable row level security;

drop policy if exists "Model tags: readable when parent model is readable" on public.model_tags;
create policy "Model tags: readable when parent model is readable"
  on public.model_tags for select to authenticated
  using (
    exists (
      select 1
        from public.models m
       where m.id = model_tags.model_id
         and (
           m.owner_profile_id = auth.uid()
           or (
             m.deleted_at is null
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
    )
  );

drop policy if exists "Model tags: owner can insert" on public.model_tags;
create policy "Model tags: owner can insert"
  on public.model_tags for insert to authenticated
  with check (
    exists (
      select 1
        from public.models m
       where m.id = model_tags.model_id
         and m.owner_profile_id = auth.uid()
         and m.deleted_at is null
    )
  );

drop policy if exists "Model tags: owner can delete" on public.model_tags;
create policy "Model tags: owner can delete"
  on public.model_tags for delete to authenticated
  using (
    exists (
      select 1
        from public.models m
       where m.id = model_tags.model_id
         and m.owner_profile_id = auth.uid()
    )
  );

-- Rollback (commented; for reference only):
--   drop table public.model_tags;
