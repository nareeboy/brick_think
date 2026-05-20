-- supabase/migrations/20260520140000_stage_scenario_title_override.sql
-- Per-stage scenario title override, paired with the body override added in
-- 20260520120000. Lets the facilitator rename the canonical prompt for their
-- session (e.g. "Tower of any height" → "Architecture warm-up"). Null = use
-- canonical scenarios.title. Length mirrors the scenarios.title CHECK.
-- Idempotent.

alter table public.stages
  add column if not exists scenario_title_override text;

alter table public.stages
  drop constraint if exists stages_scenario_title_override_len_chk;
alter table public.stages
  add constraint stages_scenario_title_override_len_chk
    check (scenario_title_override is null or char_length(scenario_title_override) <= 120);
