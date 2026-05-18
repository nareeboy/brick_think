-- Backfill default durations on stages with NULL duration_seconds.
--
-- Sessions created before the stage controller PR shipped have NULL
-- duration_seconds because createSession never set it. The participant timer
-- chip needs a non-null duration to render the countdown digits. PRD §4
-- specifies the defaults applied here. Future stages get these via the
-- createSession action; this migration patches the historical gap.
--
-- Idempotent: re-running on an already-backfilled DB is a no-op because the
-- WHERE clause limits updates to rows still NULL.
--
-- The individual_model stage encodes only the build portion (10 min, PRD §4.2);
-- the 3-minute narration timer per participant is out of scope for MVP.

update public.stages set duration_seconds = 15 * 60 where stage_type = 'skill_building'   and duration_seconds is null;
update public.stages set duration_seconds = 10 * 60 where stage_type = 'individual_model' and duration_seconds is null;
update public.stages set duration_seconds = 30 * 60 where stage_type = 'shared_model'     and duration_seconds is null;
update public.stages set duration_seconds = 25 * 60 where stage_type = 'system_model'     and duration_seconds is null;
update public.stages set duration_seconds = 20 * 60 where stage_type = 'guiding_principles' and duration_seconds is null;
