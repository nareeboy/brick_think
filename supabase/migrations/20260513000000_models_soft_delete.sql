-- supabase/migrations/20260513000000_models_soft_delete.sql
-- Soft-delete + 30-day trash retention for personal models.
-- Companion spec: docs/superpowers/specs/2026-05-13-soft-delete-trash-design.md

-- 1. Column
alter table public.models
  add column deleted_at timestamptz;

-- 2. Partial index for the trash query. Tiny, only trashed rows.
create index models_owner_trash_idx
  on public.models(owner_profile_id, deleted_at desc)
  where deleted_at is not null;

-- 3. Split SELECT into active vs trashed. The "active" policy is the
--    default the rest of the app uses; "trashed" is opted into only by
--    the /app/designs/trash route's query.
drop policy "Models: owner can read" on public.models;

create policy "Models: owner can read active"
  on public.models for select to authenticated
  using (owner_profile_id = auth.uid() and deleted_at is null);

create policy "Models: owner can read trashed"
  on public.models for select to authenticated
  using (owner_profile_id = auth.uid() and deleted_at is not null);

-- 4. Split UPDATE into three narrow policies, one per legal transition.
--    The DB OR's them, so an update succeeds if any policy passes. Each
--    policy's with_check is tight, so the autosave PATCH cannot trash
--    a model even if its payload included deleted_at.
drop policy "Models: owner can update" on public.models;

create policy "Models: owner can update active"
  on public.models for update to authenticated
  using      (owner_profile_id = auth.uid() and deleted_at is null)
  with check (owner_profile_id = auth.uid() and deleted_at is null);

create policy "Models: owner can soft delete"
  on public.models for update to authenticated
  using      (owner_profile_id = auth.uid() and deleted_at is null)
  with check (owner_profile_id = auth.uid() and deleted_at is not null);

create policy "Models: owner can restore from trash"
  on public.models for update to authenticated
  using      (owner_profile_id = auth.uid() and deleted_at is not null)
  with check (owner_profile_id = auth.uid() and deleted_at is null);

-- "Models: owner can delete" and "Models: owner can insert" are unchanged.
-- Delete now serves purgeModelAction and emptyTrashAction only.

-- 5. pg_cron-backed daily purge of rows past their 30-day window.
create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_expired_trashed_models()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.models
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
$$;

revoke all on function public.purge_expired_trashed_models() from public;

-- Daily at 03:17 UTC. Off-peak; minute offset so it isn't on a
-- thundering-herd hour.
select cron.schedule(
  'purge-expired-trashed-models',
  '17 3 * * *',
  $$select public.purge_expired_trashed_models();$$
);

-- Rollback (commented; for reference only):
--   select cron.unschedule('purge-expired-trashed-models');
--   drop function public.purge_expired_trashed_models();
--   drop policy "Models: owner can read active"        on public.models;
--   drop policy "Models: owner can read trashed"       on public.models;
--   drop policy "Models: owner can update active"      on public.models;
--   drop policy "Models: owner can soft delete"        on public.models;
--   drop policy "Models: owner can restore from trash" on public.models;
--   create policy "Models: owner can read" on public.models for select to authenticated using (owner_profile_id = auth.uid());
--   create policy "Models: owner can update" on public.models for update to authenticated using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());
--   drop index models_owner_trash_idx;
--   alter table public.models drop column deleted_at;
