-- supabase/migrations/20260519150000_session_prep_columns.sql
-- Pre-session prep surface: per-stage scenario pick + facilitator brief +
-- explicit acknowledgments (a11y_reviewed, future: consent_collected).
-- Idempotent.

-- 1. Per-stage scenario pick. Nullable. ON DELETE SET NULL so removing a
--    template scenario in a future migration doesn't break sessions.
alter table public.stages
  add column if not exists scenario_id uuid
  references public.scenarios(id) on delete set null;

create index if not exists stages_scenario_id_idx
  on public.stages(scenario_id)
  where scenario_id is not null;

-- 2. Pre-session brief on sessions. Nullable. Markdown allowed; rendered as
--    plain text in Phase 1.
alter table public.sessions
  add column if not exists brief_text text;

alter table public.sessions
  drop constraint if exists sessions_brief_len_chk;
alter table public.sessions
  add constraint sessions_brief_len_chk
    check (brief_text is null or char_length(brief_text) <= 4000);

-- 3. Pre-session checklist acknowledgments. Whitelist enforced in the server
--    action (see app/(authed)/app/sessions/scenario-actions.ts).
alter table public.sessions
  add column if not exists pre_session_check jsonb not null default '{}'::jsonb;
