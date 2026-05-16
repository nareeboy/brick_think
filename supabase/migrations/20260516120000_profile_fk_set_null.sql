-- supabase/migrations/20260516120000_profile_fk_set_null.sql
--
-- Unblocks `auth.users` (and therefore profile) deletion for the
-- "delete my account" flow on /app/account.
--
-- Two FKs into public.profiles are NO ACTION (default). Postgres evaluates
-- those constraints before the parallel CASCADE-via-models / CASCADE-via-orgs
-- can clear the same-user rows, so even a user who owns the dependent rows
-- transitively can't be deleted from auth.users. The fix is to flip those FKs
-- to ON DELETE SET NULL and drop the NOT NULL so collaborative history
-- (session facilitation, version authorship) survives the original author
-- leaving — with UI fallbacks for null attribution.
--
-- organisations.owner_id stays NOT NULL on purpose: an org without an owner
-- is broken (RLS keys "owner can delete" off it). The delete-account flow
-- refuses while the user owns an org with other members, or hard-deletes
-- sole-owner empty orgs as a pre-step.
--
-- Idempotent: re-runs on the already-migrated remote / fresh local stack
-- are no-ops. See supabase/CLAUDE.md → "Out-of-band schema changes".

-- ------------------------------------------------------------
-- model_versions.created_by  →  ON DELETE SET NULL, nullable
-- ------------------------------------------------------------

alter table public.model_versions
  alter column created_by drop not null;

alter table public.model_versions
  drop constraint if exists model_versions_created_by_fkey;

alter table public.model_versions
  add constraint model_versions_created_by_fkey
  foreign key (created_by) references public.profiles(id)
  on delete set null;

-- ------------------------------------------------------------
-- sessions.facilitator_id  →  ON DELETE SET NULL, nullable
-- ------------------------------------------------------------
--
-- The "Sessions: facilitator or admin can write" policy uses
-- `facilitator_id = auth.uid()`. Null safely compares as false, so the
-- policy continues to deny writes to a session whose facilitator has been
-- deleted (org admins can still write — that branch is independent).

alter table public.sessions
  alter column facilitator_id drop not null;

alter table public.sessions
  drop constraint if exists sessions_facilitator_id_fkey;

alter table public.sessions
  add constraint sessions_facilitator_id_fkey
  foreign key (facilitator_id) references public.profiles(id)
  on delete set null;
