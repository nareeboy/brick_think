-- Per-session overrides for stage title and description.
--
-- Stages are seeded from the fixed `stage_type` enum, so each session starts
-- with the canonical labels rendered in the UI (via STAGE_LABELS /
-- STAGE_DESCRIPTIONS constants). These two columns let a facilitator (or
-- org admin) rename or re-describe a specific stage in a specific session
-- without affecting any other session or the defaults.
--
-- Both columns are nullable: null means "fall back to the default label /
-- description for the stage_type". The UI is responsible for the fallback.

alter table public.stages
  add column if not exists title text,
  add column if not exists description text;

-- Length guards to keep the editor inputs honest and prevent abusive payloads.
-- 200 chars matches sessions.title; 500 is enough for a few sentences of
-- description without becoming a free-form notes field.
alter table public.stages
  drop constraint if exists stages_title_length;
alter table public.stages
  add constraint stages_title_length
  check (title is null or char_length(title) between 1 and 200);

alter table public.stages
  drop constraint if exists stages_description_length;
alter table public.stages
  add constraint stages_description_length
  check (description is null or char_length(description) between 1 and 500);
