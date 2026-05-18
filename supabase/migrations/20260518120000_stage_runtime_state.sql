-- supabase/migrations/20260518120000_stage_runtime_state.sql
-- Stage controller + timer (PRD §5.3). Adds runtime state to `stages`, a
-- session-level `current_stage_id` pointer, and an append-only event log.
-- The `profiles.a11y_preferences` column is already added by
-- 20260518000000_profile_a11y_preferences.sql (WCAG Phase 2); audio-cue and
-- no-time-pressure prefs are scoped out of this PR and ship in a follow-up.
-- Idempotent — re-running via `pnpm db:reset` is a no-op past the first apply.

-- 1. Stage status enum.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'stage_status') then
    create type public.stage_status as enum ('pending', 'active', 'paused', 'completed');
  end if;
end $$;

-- 2. Runtime columns on stages.
alter table public.stages
  add column if not exists status public.stage_status not null default 'pending',
  add column if not exists paused_at timestamptz,
  add column if not exists total_paused_ms bigint not null default 0,
  add column if not exists extended_seconds integer not null default 0;

alter table public.stages
  drop constraint if exists stages_total_paused_ms_nonneg;
alter table public.stages
  add constraint stages_total_paused_ms_nonneg check (total_paused_ms >= 0);

alter table public.stages
  drop constraint if exists stages_extended_seconds_nonneg;
alter table public.stages
  add constraint stages_extended_seconds_nonneg check (extended_seconds >= 0);

-- 3. Session-level pointer to the currently-active stage.
alter table public.sessions
  add column if not exists current_stage_id uuid references public.stages(id) on delete set null;

create index if not exists sessions_current_stage_idx on public.sessions(current_stage_id);

-- 4. Append-only event log.
create table if not exists public.stage_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  verb text not null check (verb in ('start','pause','resume','extend','advance','rollback')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stage_events_session_idx on public.stage_events(session_id, created_at);
create index if not exists stage_events_stage_idx on public.stage_events(stage_id);

alter table public.stage_events enable row level security;

drop policy if exists "Stage events: org members read" on public.stage_events;
create policy "Stage events: org members read"
  on public.stage_events for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = stage_events.session_id
        and public.is_org_member(s.org_id)
    )
  );

drop policy if exists "Stage events: facilitator insert" on public.stage_events;
create policy "Stage events: facilitator insert"
  on public.stage_events for insert to authenticated
  with check (
    actor_profile_id = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = stage_events.session_id
        and s.facilitator_id = auth.uid()
    )
  );

-- 5. Realtime publication — only `stages` + `sessions`.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stages'
  ) then
    alter publication supabase_realtime add table public.stages;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
end $$;
