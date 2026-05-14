-- Collapse the dual SELECT policies on public.models, and tighten the
-- model_versions SELECT policy to refuse versions of trashed models.
--
-- Closes:
--   docs/superpowers/followups/2026-05-13-soft-delete-trash-followups.md
--     #1  Collapse dual SELECT policies
--     #3  Tighten model_versions on m.deleted_at IS NULL
--
-- Why
-- ---
-- Stream #7 (soft delete / trash) introduced two permissive SELECT
-- policies on `public.models`:
--   • "Models: owner can read active"   (deleted_at IS NULL)
--   • "Models: owner can read trashed"  (deleted_at IS NOT NULL)
-- with the idea that RLS would filter trashed rows out of every active
-- query automatically. That assumption was wrong (PG OR's permissive
-- policies of the same command, so the two collapse to one effective
-- `owner = auth.uid()`), and the soft-delete followup ships an explicit
-- `.is('deleted_at', null)` filter on every active query as the real
-- enforcement point.
--
-- Streams #1 and #2 then dropped the "active" policy and replaced it
-- with the org+session-reader version. The "trashed" half stayed, so
-- the current state is:
--   • "Models: owner can read trashed"                       — owner + trashed
--   • "Models: owner, org reader, or session reader can read active" — active rows
-- Two policies, neither doing the active-vs-trashed split the original
-- design promised. Consolidate them into one.
--
-- model_versions SELECT joins on models without filtering deleted_at, so
-- an owner can still read the versions of their trashed model. The UI
-- has no path to do this (builder 404s on trashed), but defence-in-depth
-- in case a future trash-preview surface ever lands.

set search_path = public;

-- 1. Consolidated SELECT on models.
--    Owner sees their own row regardless of deleted_at — needed so the
--    /app/designs/trash route works without a separate "trashed" policy
--    (and the app already filters trashed rows out of every active query
--    explicitly, so RLS doesn't need to do that filtering).
--    Org / session readers see only deleted_at IS NULL rows. Org models
--    can technically be soft-deleted today; we keep org/session readers
--    blind to trashed rows so a "shared with my org" model that the
--    owner trashes vanishes from co-workers' lists.
drop policy if exists "Models: owner can read active"        on public.models;
drop policy if exists "Models: owner can read trashed"       on public.models;
drop policy if exists "Models: owner or shared org member can read active" on public.models;
drop policy if exists "Models: owner, org reader, or session reader can read active" on public.models;
drop policy if exists "Models: owner, org reader, or session reader can read" on public.models;

create policy "Models: owner, org reader, or session reader can read"
  on public.models for select to authenticated
  using (
    owner_profile_id = auth.uid()
    or (
      deleted_at is null
      and (
        (org_id is not null and public.is_org_member(org_id))
        or (
          session_id is not null
          and exists (
            select 1 from public.sessions s
            where s.id = models.session_id
              and public.is_org_member(s.org_id)
          )
        )
      )
    )
  );

-- 2. Close the trashed-row UPDATE loophole.
--
-- The soft-delete and restore UPDATE policies are intended to model two
-- transitions:
--   • soft-delete: USING (deleted_at IS NULL)     → WITH CHECK (deleted_at IS NOT NULL)
--   • restore:     USING (deleted_at IS NOT NULL) → WITH CHECK (deleted_at IS NULL)
-- Combined with the active-update policy they should cover every legal
-- UPDATE to a `models` row.
--
-- The bug: Postgres OR's both USING and WITH CHECK clauses across
-- permissive policies. When the owner sends `UPDATE { canvas_state }` on
-- an already-trashed row, restore-USING matches the OLD row (deleted_at
-- IS NOT NULL), so the row is updatable; soft-delete-WITH-CHECK matches
-- the NEW row (deleted_at IS NOT NULL — because canvas_state changes
-- without touching deleted_at), so the new state is acceptable. The
-- combined effect: any column on a trashed row can be mutated by its
-- owner via a blind PATCH (the autosave path does exactly this without
-- a `.is('deleted_at', null)` filter).
--
-- WITH CHECK can only see the new row, so the schema cannot disambiguate
-- "soft-delete transition" from "already-trashed mutation" via policies
-- alone. The trigger below has access to OLD and NEW and enforces:
--   if OLD.deleted_at IS NOT NULL  AND  NEW.deleted_at IS NOT NULL
--     → reject; the row is in trash and must be restored or hard-deleted.
-- Restore (NEW.deleted_at IS NULL) and soft-delete (OLD.deleted_at IS NULL)
-- both pass cleanly.
create or replace function public.reject_update_to_trashed_model()
returns trigger
language plpgsql
as $$
begin
  if old.deleted_at is not null and new.deleted_at is not null then
    raise exception 'Cannot update a trashed model. Restore it first or hard-delete it.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_update_to_trashed_model_trg on public.models;
create trigger reject_update_to_trashed_model_trg
  before update on public.models
  for each row execute function public.reject_update_to_trashed_model();

-- 3. Tighten model_versions SELECT: refuse versions of trashed models.
--    Cheap defence-in-depth — the builder route already 404s on trashed
--    models so there's no UI path to a "show versions of a trashed model"
--    query today, but the policy now enforces it at the schema level for
--    any future surface.
drop policy if exists "Model versions: owner of model can read" on public.model_versions;
create policy "Model versions: owner of active model can read"
  on public.model_versions for select to authenticated
  using (
    exists (
      select 1 from public.models m
      where m.id = model_versions.model_id
        and m.owner_profile_id = auth.uid()
        and m.deleted_at is null
    )
  );

-- Rollback (commented; for reference only):
--   drop trigger reject_update_to_trashed_model_trg on public.models;
--   drop function public.reject_update_to_trashed_model();
--   drop policy "Models: owner, org reader, or session reader can read" on public.models;
--   create policy "Models: owner can read trashed"
--     on public.models for select to authenticated
--     using (owner_profile_id = auth.uid() and deleted_at is not null);
--   create policy "Models: owner, org reader, or session reader can read active"
--     on public.models for select to authenticated
--     using (
--       deleted_at is null
--       and (
--         owner_profile_id = auth.uid()
--         or (org_id is not null and public.is_org_member(org_id))
--         or (
--           session_id is not null
--           and exists (
--             select 1 from public.sessions s
--             where s.id = models.session_id and public.is_org_member(s.org_id)
--           )
--         )
--       )
--     );
--   drop policy "Model versions: owner of active model can read" on public.model_versions;
--   create policy "Model versions: owner of model can read"
--     on public.model_versions for select to authenticated
--     using (
--       exists (
--         select 1 from public.models m
--         where m.id = model_versions.model_id
--           and m.owner_profile_id = auth.uid()
--       )
--     );
