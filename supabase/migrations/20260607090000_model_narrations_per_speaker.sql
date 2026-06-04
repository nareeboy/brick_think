-- 20260607090000_model_narrations_per_speaker.sql
--
-- Allow one narration per (model, speaker) instead of per model. On a shared
-- room canvas each member contributes their own narration; they are combined
-- into one transcript per room at read time. Individual canvases still hold
-- exactly one narration (a single owner). Non-destructive: re-recording replaces
-- only the speaker's own row (saveNarration upserts on this pair).

alter table public.model_narrations drop constraint if exists model_narrations_model_id_key;

create unique index if not exists model_narrations_model_speaker_uniq
  on public.model_narrations (model_id, profile_id);
