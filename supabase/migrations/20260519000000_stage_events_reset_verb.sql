-- Extend `stage_events.verb` CHECK constraint to allow 'reset'.
--
-- The stage controller gains a Reset verb: facilitator restarts the
-- current active/paused stage with a fresh clock, clearing accumulated
-- pause and extend counters. Status stays 'active'.
--
-- Idempotent: drops the constraint if present, then re-adds it with the
-- expanded list. Safe to replay via `pnpm db:reset`.

alter table public.stage_events
  drop constraint if exists stage_events_verb_check;

alter table public.stage_events
  add constraint stage_events_verb_check
  check (verb in ('start', 'pause', 'resume', 'extend', 'advance', 'rollback', 'reset'));
