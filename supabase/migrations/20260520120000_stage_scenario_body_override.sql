-- supabase/migrations/20260520120000_stage_scenario_body_override.sql
-- Per-stage scenario body override. When set, the stage card renders this
-- text instead of the canonical scenarios.body — lets facilitators tweak
-- the prompt for their group without forking the canonical seed. Null =
-- use the canonical body. Idempotent.

alter table public.stages
  add column if not exists scenario_body_override text;

alter table public.stages
  drop constraint if exists stages_scenario_body_override_len_chk;
alter table public.stages
  add constraint stages_scenario_body_override_len_chk
    check (scenario_body_override is null or char_length(scenario_body_override) <= 4000);
