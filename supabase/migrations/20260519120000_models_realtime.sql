-- supabase/migrations/20260519110000_models_realtime.sql
-- Adds public.models to supabase_realtime so non-owner session-org-members
-- can observe live updates to canvas_state + title via postgres_changes
-- (facilitator live read-only view). Mirrors the stages/sessions pattern
-- from 20260518120000_stage_runtime_state.sql + 20260518130000_stages_realtime_identity.sql.
-- Idempotent: re-applying via pnpm db:reset is a no-op past the first apply.

-- 1. Add models to the supabase_realtime publication (if not already there).
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'models'
  ) then
    alter publication supabase_realtime add table public.models;
  end if;
end $$;

-- 2. REPLICA IDENTITY FULL so UPDATE payloads carry the full row through the
-- RLS row-filter (without it the OLD record is PK-only and RLS gates can't
-- evaluate). See supabase/CLAUDE.md "Stage controller runtime state".
alter table public.models replica identity full;
