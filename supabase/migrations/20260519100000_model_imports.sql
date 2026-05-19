-- supabase/migrations/20260519100000_model_imports.sql
-- "Bring in my previous model" audit + idempotency table.
--
-- One row per (target_model_id, profile_id). The unique constraint catches
-- double-click races at the database layer; for shared_model the row IS the
-- gate (the destination canvas is shared so the "is canvas empty?" check is
-- not authoritative). For system_model the empty-canvas check is the gate
-- and this row is informational, kept for an audit trail.
-- Idempotent — re-running via `pnpm db:reset` is a no-op past the first apply.

create table if not exists public.model_imports (
  id uuid primary key default gen_random_uuid(),
  target_model_id uuid not null references public.models(id) on delete cascade,
  source_model_id uuid not null references public.models(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  imported_at     timestamptz not null default now()
);

alter table public.model_imports
  drop constraint if exists model_imports_unique_target_profile;
alter table public.model_imports
  add constraint model_imports_unique_target_profile
  unique (target_model_id, profile_id);

create index if not exists model_imports_target_idx
  on public.model_imports (target_model_id);
create index if not exists model_imports_profile_idx
  on public.model_imports (profile_id);

alter table public.model_imports enable row level security;

-- SELECT: any session-org member of the target model's session can read.
drop policy if exists "Model imports: org members read" on public.model_imports;
create policy "Model imports: org members read"
  on public.model_imports for select to authenticated
  using (
    exists (
      select 1
      from public.models m
      join public.sessions s on s.id = m.session_id
      where m.id = model_imports.target_model_id
        and public.is_org_member(s.org_id)
    )
  );

-- INSERT / UPDATE / DELETE: no policy = denied for authenticated users.
-- The bringInPreviousModel server action writes through the service-role
-- client, which bypasses RLS.
