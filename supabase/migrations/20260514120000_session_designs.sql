-- supabase/migrations/20260514120000_session_designs.sql
-- Session-scoped designs (stream 2 of the persistent-designs roadmap).
-- Adds session_id/stage_id to models with mutual-exclusion against org_id,
-- a composite FK that enforces "the stage actually belongs to that session,"
-- a partial unique index for one-model-per-(session, stage, owner), additive
-- RLS for facilitator override, and hardens the stream-7 soft-delete policies
-- so session-scoped rows can never enter the trash.
-- Companion spec: docs/superpowers/specs/2026-05-13-session-scoped-designs-design.md

-- 1. Composite uniqueness on stages so models can FK on the (id, session_id) pair.
--    This is what enforces "stage belongs to its session" declaratively. The
--    UNIQUE is redundant against the existing PK on stages.id but is required
--    by Postgres as the target of a composite FK.
alter table public.stages
  add constraint stages_id_session_uniq unique (id, session_id);

-- 2. New columns on models. Both nullable; null = not session-scoped.
alter table public.models
  add column session_id uuid,
  add column stage_id   uuid;

-- 3. Composite FK. ON DELETE CASCADE: deleting a stage hard-deletes its models;
--    deleting a session cascades stages -> models. Soft-delete is bypassed by
--    design (decision 6 in the spec).
alter table public.models
  add constraint models_stage_session_fk
    foreign key (stage_id, session_id) references public.stages(id, session_id)
    on delete cascade;

-- 4. Context exclusivity + pair integrity. A model is in exactly one context;
--    (session_id, stage_id) move together.
alter table public.models
  add constraint models_context_exclusive check (
    not (session_id is not null and org_id is not null)
    and (session_id is null) = (stage_id is null)
  );

-- 5. Idempotency: one active model per (session, stage, owner).
create unique index models_session_stage_owner_active_idx
  on public.models(session_id, stage_id, owner_profile_id)
  where session_id is not null and deleted_at is null;

-- 6. Lookup index for session pages.
create index models_session_stage_idx
  on public.models(session_id, stage_id, created_at)
  where session_id is not null;

-- 7. Widen the active-SELECT policy stream #1 installed so session readers
--    (any member of session.org_id) can read session-scoped active rows.
drop policy "Models: owner or shared org member can read active" on public.models;
create policy "Models: owner, org reader, or session reader can read active"
  on public.models for select to authenticated
  using (
    deleted_at is null
    and (
      owner_profile_id = auth.uid()
      or (org_id is not null and public.is_org_member(org_id))
      or (
        session_id is not null
        and exists (
          select 1 from public.sessions s
          where s.id = models.session_id
            and public.is_org_member(s.org_id)
        )
      )
    )
  );

-- 8. Additive UPDATE policy: facilitator or org admin can write session models.
create policy "Models: session facilitator can update active"
  on public.models for update to authenticated
  using (
    deleted_at is null
    and session_id is not null
    and exists (
      select 1 from public.sessions s
      where s.id = models.session_id
        and (s.facilitator_id = auth.uid() or public.is_org_admin(s.org_id))
    )
  )
  with check (
    deleted_at is null
    and session_id is not null
    and exists (
      select 1 from public.sessions s
      where s.id = models.session_id
        and (s.facilitator_id = auth.uid() or public.is_org_admin(s.org_id))
    )
  );

-- 9. Additive DELETE policy: facilitator or org admin can delete session models.
create policy "Models: session facilitator can delete"
  on public.models for delete to authenticated
  using (
    session_id is not null
    and exists (
      select 1 from public.sessions s
      where s.id = models.session_id
        and (s.facilitator_id = auth.uid() or public.is_org_admin(s.org_id))
    )
  );

-- 10. Harden the stream-7 soft-delete policies to refuse session rows. After
--     this migration, "session models cannot be soft-deleted" is a DB invariant.
drop policy "Models: owner can soft delete" on public.models;
create policy "Models: owner can soft delete"
  on public.models for update to authenticated
  using      (owner_profile_id = auth.uid() and deleted_at is null and session_id is null)
  with check (owner_profile_id = auth.uid() and deleted_at is not null and session_id is null);

drop policy "Models: owner can restore from trash" on public.models;
create policy "Models: owner can restore from trash"
  on public.models for update to authenticated
  using      (owner_profile_id = auth.uid() and deleted_at is not null and session_id is null)
  with check (owner_profile_id = auth.uid() and deleted_at is null and session_id is null);

-- Rollback (commented; for reference only):
--   drop policy "Models: owner can restore from trash" on public.models;
--   create policy "Models: owner can restore from trash"
--     on public.models for update to authenticated
--     using      (owner_profile_id = auth.uid() and deleted_at is not null)
--     with check (owner_profile_id = auth.uid() and deleted_at is null);
--   drop policy "Models: owner can soft delete" on public.models;
--   create policy "Models: owner can soft delete"
--     on public.models for update to authenticated
--     using      (owner_profile_id = auth.uid() and deleted_at is null)
--     with check (owner_profile_id = auth.uid() and deleted_at is not null);
--   drop policy "Models: session facilitator can delete" on public.models;
--   drop policy "Models: session facilitator can update active" on public.models;
--   drop policy "Models: owner, org reader, or session reader can read active" on public.models;
--   create policy "Models: owner or shared org member can read active"
--     on public.models for select to authenticated
--     using (
--       deleted_at is null
--       and (
--         owner_profile_id = auth.uid()
--         or (org_id is not null and public.is_org_member(org_id))
--       )
--     );
--   drop index if exists models_session_stage_idx;
--   drop index if exists models_session_stage_owner_active_idx;
--   alter table public.models drop constraint if exists models_context_exclusive;
--   alter table public.models drop constraint if exists models_stage_session_fk;
--   alter table public.models drop column if exists stage_id;
--   alter table public.models drop column if exists session_id;
--   alter table public.stages drop constraint if exists stages_id_session_uniq;
