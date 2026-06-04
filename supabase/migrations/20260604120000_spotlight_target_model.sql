-- 20260604120000_spotlight_target_model.sql
--
-- Retarget the session spotlight from a *profile* to a *model (canvas)*.
--
-- The facilitator's Spotlight control used to point at a participant
-- (`sessions.spotlight_target_profile_id`), and the banner resolved "that
-- person's model on the current stage." That breaks two ways:
--   1. Room-backed stages (shared_model / system_model / guiding_principles)
--      have no per-participant model — the canvas belongs to a room.
--   2. After a stage finishes or the session ends, "their model on the
--      current stage" resolves to the wrong canvas.
--
-- Every spotlightable thing is a public.models row, so we point the spotlight
-- directly at a model id. One uniform mechanism across every stage type,
-- decoupled from session/stage lifecycle.
--
-- Spotlight state is transient — no data to preserve — and
-- spotlight_target_profile_id is not referenced by any RLS policy, so the swap
-- is safe. sessions is already in supabase_realtime with REPLICA IDENTITY FULL
-- (stage_runtime_state migration), so spotlight_target_model_id UPDATEs ride
-- that existing surface with no further setup.

alter table public.sessions
  drop column if exists spotlight_target_profile_id,
  add column if not exists spotlight_target_model_id uuid
    references public.models(id) on delete set null;
