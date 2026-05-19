'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import {
  dispatchSessionStartedNotifications,
  resolveActorDisplay,
} from '@/lib/notifications/dispatch';
import { isValidTransition, type StageVerb } from '@/lib/sessions/stage-state-machine';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXTEND_MAX_SECONDS = 60 * 60; // 1 hour cap
const STAGE_DURATION_MIN_SECONDS = 60; // 1 minute floor
const STAGE_DURATION_MAX_SECONDS = 2 * 60 * 60; // 2 hour ceiling

// ── Return types ──────────────────────────────────────────────────────────────

export type StageActionFailure =
  | { ok: false; code: 'unauthenticated' }
  | { ok: false; code: 'invalid_uuid' }
  | { ok: false; code: 'stage_not_found' }
  | { ok: false; code: 'session_not_found' }
  | { ok: false; code: 'not_facilitator' }
  | { ok: false; code: 'invalid_transition'; from: string; verb: StageVerb }
  | { ok: false; code: 'no_next_stage' }
  | { ok: false; code: 'no_previous_completed_stage' }
  | { ok: false; code: 'invalid_extend_amount' }
  | { ok: false; code: 'invalid_duration_amount' };

export type StageActionResult = { ok: true } | StageActionFailure;

// ── Internal stage shape returned from the joined select ─────────────────────

interface StageWithSession {
  id: string;
  session_id: string;
  status: 'pending' | 'active' | 'paused' | 'completed';
  position: number;
  duration_seconds: number | null;
  started_at: string | null;
  paused_at: string | null;
  total_paused_ms: number;
  extended_seconds: number;
  sessions: { id: string; facilitator_id: string | null; status: string; org_id: string };
}

// NOTE: Each verb performs an UPDATE (or pair of UPDATEs for advance/rollback)
// followed by an INSERT into stage_events. These calls are NOT wrapped in a
// Postgres transaction — supabase-js doesn't expose transactions and the
// PostgREST API has no transaction primitive. If the stage_events INSERT
// fails after the UPDATE landed, the audit log will be missing one entry but
// the stage state itself is consistent. The probability is low (same pooled
// connection, same DB, single-statement atomicity per call). A follow-up PR
// will lift each verb into a plpgsql RPC function (`apply_stage_verb(...)`)
// to make UPDATE + INSERT truly atomic. Until then, the trade-off is
// accepted tech debt.

// ── Shared auth + authorisation gate ─────────────────────────────────────────

/**
 * Validate UUID, authenticate the caller via the RLS-scoped client, fetch the
 * stage joined with its session (RLS rejects non-org-members here), and assert
 * the caller is the session's facilitator. Returns the stage and caller ids on
 * success, or an error shape that can be returned directly from the action.
 *
 * No mutations happen here — read-only.
 */
async function requireFacilitatorForStage(stageId: string): Promise<
  | { error: StageActionFailure }
  | { stage: StageWithSession; sessionId: string; userId: string }
> {
  if (!UUID_RE.test(stageId)) {
    return { error: { ok: false, code: 'invalid_uuid' } };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { ok: false, code: 'unauthenticated' } };

  const stageRes = await supabase
    .from('stages')
    .select(
      'id, session_id, status, position, duration_seconds, started_at, paused_at, total_paused_ms, extended_seconds, sessions!stages_session_id_fkey ( id, facilitator_id, status, org_id )',
    )
    .eq('id', stageId)
    .maybeSingle();

  if (stageRes.error) {
    throw new Error(`Failed to load stage: ${stageRes.error.message}`);
  }
  if (!stageRes.data) {
    return { error: { ok: false, code: 'stage_not_found' } };
  }

  const stage = stageRes.data as unknown as StageWithSession;

  if (stage.sessions.facilitator_id !== user.id) {
    return { error: { ok: false, code: 'not_facilitator' } };
  }

  return { stage, sessionId: stage.session_id, userId: user.id };
}

// ── Path revalidation helper ──────────────────────────────────────────────────

function revalidate(sessionId: string): void {
  // Both target pages are currently force-dynamic; these calls are no-ops
  // until those pages become incrementally static or the StageController
  // (Task 4) routes mutations through cached server components. Keep them so
  // the cache contract holds the day either page's dynamic flag flips.
  revalidatePath(`/app/sessions/${sessionId}`);
  revalidatePath('/app/designs/[id]', 'page');
}

// ── Verb implementations ──────────────────────────────────────────────────────

/**
 * Start a stage: sets it to active, records started_at, promotes the
 * session to live (whether it was draft, scheduled, or completed — the last
 * case happens when a facilitator hits Stop and then clicks Start again to
 * resume the workshop, either on the next pending stage or on the just-
 * stopped completed stage), and moves the session's current_stage_id
 * pointer.
 *
 * Reviving a completed stage clears ended_at and zeros total_paused_ms /
 * extended_seconds — the stage gets a fresh clock, equivalent to a Reset
 * applied at the same instant Start fires.
 */
export async function startStageAction(stageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (!isValidTransition(stage.status, 'start')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'start' };
  }

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const upd = await svc
    .from('stages')
    .update({
      status: 'active',
      started_at: nowIso,
      paused_at: null,
      ended_at: null,
      total_paused_ms: 0,
      extended_seconds: 0,
    })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`startStage update failed: ${upd.error.message}`);

  // A stage going active should always have a live session behind it. If the
  // session was draft / scheduled / completed (i.e. anything but live or
  // archived), promote it to live. Archived sessions never reach this branch
  // because RLS hides the stage row at the read step earlier.
  const newSessionStatus = stage.sessions.status === 'archived' ? 'archived' : 'live';

  const sessUpd = await svc
    .from('sessions')
    .update({ current_stage_id: stage.id, status: newSessionStatus })
    .eq('id', sessionId);
  if (sessUpd.error) throw new Error(`session pointer update failed: ${sessUpd.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'start',
    actor_profile_id: userId,
    metadata: {},
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  // Session-started fan-out: only on the *first* time a session goes live.
  // Restarting a stopped session (status was `completed`, now back to `live`)
  // does NOT re-fire — org members were already notified once.
  const wasFirstStart =
    stage.sessions.status === 'draft' || stage.sessions.status === 'scheduled';
  if (wasFirstStart) {
    const facilitatorRes = await svc
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();
    const facilitatorDisplay = resolveActorDisplay({
      fullName: facilitatorRes.data?.full_name,
      email: facilitatorRes.data?.email,
    });
    await dispatchSessionStartedNotifications({
      sessionId,
      orgId: stage.sessions.org_id,
      facilitatorProfileId: userId,
      facilitatorDisplay,
    });
  }

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Pause an active stage: sets it to paused and records paused_at.
 */
export async function pauseStageAction(stageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (!isValidTransition(stage.status, 'pause')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'pause' };
  }

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const upd = await svc
    .from('stages')
    .update({ status: 'paused', paused_at: nowIso })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`pauseStage update failed: ${upd.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'pause',
    actor_profile_id: userId,
    metadata: {},
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Resume a paused stage: clears paused_at, accumulates elapsed pause time into
 * total_paused_ms, and sets status back to active.
 */
export async function resumeStageAction(stageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (!isValidTransition(stage.status, 'resume')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'resume' };
  }
  if (stage.paused_at === null) {
    // Invariant: paused state always has paused_at set. Treat as data corruption.
    throw new Error('resumeStage invariant: paused_at is null in paused state');
  }

  const pausedForMs = Date.now() - Date.parse(stage.paused_at);
  const svc = getServiceSupabaseClient();

  const upd = await svc
    .from('stages')
    .update({
      status: 'active',
      paused_at: null,
      total_paused_ms: stage.total_paused_ms + pausedForMs,
    })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`resumeStage update failed: ${upd.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'resume',
    actor_profile_id: userId,
    metadata: { paused_for_ms: pausedForMs },
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Extend an active or paused stage by `additionalSeconds` (positive integer,
 * max 3600). Accumulates into extended_seconds.
 */
export async function extendStageAction(
  stageId: string,
  additionalSeconds: number,
): Promise<StageActionResult> {
  if (
    !Number.isInteger(additionalSeconds) ||
    additionalSeconds <= 0 ||
    additionalSeconds > EXTEND_MAX_SECONDS
  ) {
    return { ok: false, code: 'invalid_extend_amount' };
  }

  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (ctx.stage.duration_seconds === null) {
    return { ok: false, code: 'invalid_extend_amount' };
  }

  if (!isValidTransition(stage.status, 'extend')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'extend' };
  }

  const svc = getServiceSupabaseClient();
  const upd = await svc
    .from('stages')
    .update({ extended_seconds: stage.extended_seconds + additionalSeconds })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`extendStage update failed: ${upd.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'extend',
    actor_profile_id: userId,
    metadata: { extended_seconds: additionalSeconds },
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Advance an active or paused stage to completed and move the session pointer
 * to the next stage by position. Returns no_next_stage if the current stage is
 * the last one.
 */
export async function advanceStageAction(stageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (!isValidTransition(stage.status, 'advance')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'advance' };
  }

  // Find the next stage by position — read via the RLS-scoped client (the
  // caller is an org member so they can read all stages in the session).
  const supabase = await createServerSupabaseClient();
  const nextRes = await supabase
    .from('stages')
    .select('id, position')
    .eq('session_id', sessionId)
    .gt('position', stage.position)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextRes.error) throw new Error(`advanceStage next lookup failed: ${nextRes.error.message}`);
  if (!nextRes.data) return { ok: false, code: 'no_next_stage' };
  const nextStageId = nextRes.data.id;

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  // Complete the current stage.
  const u1 = await svc
    .from('stages')
    .update({ status: 'completed', ended_at: nowIso, paused_at: null })
    .eq('id', stage.id);
  if (u1.error) throw new Error(`advanceStage current update failed: ${u1.error.message}`);

  // Move the session pointer to the next stage.
  const u2 = await svc
    .from('sessions')
    .update({ current_stage_id: nextStageId })
    .eq('id', sessionId);
  if (u2.error) throw new Error(`advanceStage session update failed: ${u2.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'advance',
    actor_profile_id: userId,
    metadata: { next_stage_id: nextStageId },
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Roll back to a previously-completed stage: reset the current (from) stage to
 * pending and the target back to active with a fresh started_at. Move the
 * session pointer to the target.
 *
 * Preconditions:
 * - target.status === 'completed' (state-machine gate)
 * - sessions.current_stage_id is set and differs from target.id
 */
export async function rollbackStageAction(targetStageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(targetStageId);
  if ('error' in ctx) return ctx.error;
  const { stage: target, sessionId, userId } = ctx;

  if (!isValidTransition(target.status, 'rollback')) {
    return { ok: false, code: 'invalid_transition', from: target.status, verb: 'rollback' };
  }

  // Find the current_stage_id (the one to roll back FROM).
  const supabase = await createServerSupabaseClient();
  const sessRes = await supabase
    .from('sessions')
    .select('current_stage_id')
    .eq('id', sessionId)
    .single();
  if (sessRes.error) {
    throw new Error(`rollbackStage session lookup failed: ${sessRes.error.message}`);
  }
  const fromStageId = sessRes.data.current_stage_id;
  if (!fromStageId || fromStageId === target.id) {
    return { ok: false, code: 'no_previous_completed_stage' };
  }

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  // Reset the "from" stage (currently active/paused) back to pending.
  const u1 = await svc
    .from('stages')
    .update({
      status: 'pending',
      started_at: null,
      ended_at: null,
      paused_at: null,
      total_paused_ms: 0,
      extended_seconds: 0,
    })
    .eq('id', fromStageId);
  if (u1.error) throw new Error(`rollbackStage from update failed: ${u1.error.message}`);

  // Restore the target stage to active with a fresh clock start.
  const u2 = await svc
    .from('stages')
    .update({
      status: 'active',
      started_at: nowIso,
      ended_at: null,
      paused_at: null,
      total_paused_ms: 0,
      extended_seconds: 0,
    })
    .eq('id', target.id);
  if (u2.error) throw new Error(`rollbackStage target update failed: ${u2.error.message}`);

  // Move the session pointer to the target (rollback) stage.
  const u3 = await svc
    .from('sessions')
    .update({ current_stage_id: target.id })
    .eq('id', sessionId);
  if (u3.error) throw new Error(`rollbackStage session update failed: ${u3.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: target.id,
    verb: 'rollback',
    actor_profile_id: userId,
    metadata: { from_stage_id: fromStageId, into_stage_id: target.id },
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Reset an active or paused stage: fresh clock, zeroed pause and extend
 * counters. Status stays 'active' so the facilitator doesn't have to click
 * Start again — the next second of countdown starts immediately. The
 * pre-reset runtime is preserved in the audit row for the post-session
 * report (original started_at, extended_seconds, accumulated paused ms).
 */
export async function resetStageAction(stageId: string): Promise<StageActionResult> {
  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId, userId } = ctx;

  if (!isValidTransition(stage.status, 'reset')) {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'reset' };
  }

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const upd = await svc
    .from('stages')
    .update({
      status: 'active',
      started_at: nowIso,
      paused_at: null,
      total_paused_ms: 0,
      extended_seconds: 0,
    })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`resetStage update failed: ${upd.error.message}`);

  const ev = await svc.from('stage_events').insert({
    session_id: sessionId,
    stage_id: stage.id,
    verb: 'reset',
    actor_profile_id: userId,
    metadata: {
      previous_started_at: stage.started_at,
      previous_extended_seconds: stage.extended_seconds,
      previous_total_paused_ms: stage.total_paused_ms,
      previous_status: stage.status,
    },
  });
  if (ev.error) throw new Error(`stage event insert failed: ${ev.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * Set a stage's `duration_seconds` before it starts. Allowed ONLY while
 * `status === 'pending'` — once a stage has started, use `extendStageAction`
 * for runtime additions. This is a configuration edit (not a state
 * transition), so it writes to `stages.duration_seconds` directly without
 * appending to `stage_events`. Mirrors the pattern of `updateStageMeta`
 * (which edits title/description with no audit row).
 *
 * Range: 60s ≤ N ≤ 7200s (1 minute to 2 hours).
 */
export async function updateStageDurationAction(
  stageId: string,
  durationSeconds: number,
): Promise<StageActionResult> {
  if (
    !Number.isInteger(durationSeconds) ||
    durationSeconds < STAGE_DURATION_MIN_SECONDS ||
    durationSeconds > STAGE_DURATION_MAX_SECONDS
  ) {
    return { ok: false, code: 'invalid_duration_amount' };
  }

  const ctx = await requireFacilitatorForStage(stageId);
  if ('error' in ctx) return ctx.error;
  const { stage, sessionId } = ctx;

  if (stage.status !== 'pending') {
    return { ok: false, code: 'invalid_transition', from: stage.status, verb: 'extend' };
  }

  const svc = getServiceSupabaseClient();
  const upd = await svc
    .from('stages')
    .update({ duration_seconds: durationSeconds })
    .eq('id', stage.id);
  if (upd.error) throw new Error(`updateStageDuration update failed: ${upd.error.message}`);

  revalidate(sessionId);
  return { ok: true };
}

/**
 * End a session early. Facilitator-only. Flips `sessions.status` to
 * `'completed'`, and if there's a `current_stage_id` pointing at an active
 * or paused stage, marks that stage `'completed'` too with `ended_at = now()`.
 *
 * Idempotent: if the session is already completed, returns ok without
 * writing anything. No `stage_events` row — this is a session-level action,
 * not a per-stage transition, and the audit trail lives on
 * `sessions.status` itself (visible in any backup / history view).
 *
 * Reversibility: not currently exposed in the UI. A future "Reopen
 * session" affordance would flip `sessions.status` back to `'live'` and
 * leave the per-stage rows alone (facilitator can then click `Start` on
 * whichever stage they want to resume).
 */
export async function endSessionAction(sessionId: string): Promise<StageActionResult> {
  if (!UUID_RE.test(sessionId)) {
    return { ok: false, code: 'invalid_uuid' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const sessRes = await supabase
    .from('sessions')
    .select('id, facilitator_id, current_stage_id, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessRes.error) {
    throw new Error(`endSession lookup failed: ${sessRes.error.message}`);
  }
  if (!sessRes.data) {
    return { ok: false, code: 'session_not_found' };
  }
  if (sessRes.data.facilitator_id !== user.id) {
    return { ok: false, code: 'not_facilitator' };
  }
  if (sessRes.data.status === 'completed') {
    return { ok: true }; // idempotent — already ended
  }

  const svc = getServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  // If a live stage is running, complete it. Filter on the current status so
  // we don't accidentally mark a `pending` or already-`completed` row.
  if (sessRes.data.current_stage_id) {
    const stageUpd = await svc
      .from('stages')
      .update({ status: 'completed', ended_at: nowIso, paused_at: null })
      .eq('id', sessRes.data.current_stage_id)
      .in('status', ['active', 'paused']);
    if (stageUpd.error) {
      throw new Error(`endSession stage update failed: ${stageUpd.error.message}`);
    }
  }

  const sUpd = await svc
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);
  if (sUpd.error) {
    throw new Error(`endSession session update failed: ${sUpd.error.message}`);
  }

  revalidate(sessionId);
  return { ok: true };
}
