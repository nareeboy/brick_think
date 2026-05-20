'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';

// Facilitator-only roster surface (Spec A, Task 7). Companion to the
// participant-side join surface (join-actions.ts). All four actions gate
// on "caller is the session's facilitator"; writes flow through the
// service-role client because RLS on session_participants doesn't grant
// any INSERT/UPDATE/DELETE policies (writes only happen via these
// actions, join-actions.ts, and handle_new_user invite claims).
//
// resolveSpotlightTargetModelAction is the one outlier: it's a read for
// any signed-in viewer (the spotlight banner is shown to everyone), and
// it returns a model URL to navigate to rather than mutating anything.

/**
 * Internal — verify the caller is the session's facilitator. Returns the
 * caller's profile id on success, or null if unauthenticated / not the
 * facilitator / session not found. Callers map the null to their own
 * failure codes (we collapse not-found into the same null because the
 * downstream behaviour is identical — refuse the write).
 */
async function assertFacilitator(sessionId: string): Promise<string | null> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return null;
  const service = getServiceSupabaseClient();
  const { data: session, error } = await service
    .from('sessions')
    .select('facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) {
    throw new Error(`assertFacilitator sessions select failed: ${error.message}`);
  }
  if (!session || session.facilitator_id !== user.id) return null;
  return user.id;
}

// ── removeParticipantAction ─────────────────────────────────────────────────

export type RemoveParticipantResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'unauthenticated'
        | 'not_facilitator'
        | 'cannot_remove_facilitator'
        | 'participant_not_found';
    };

/**
 * Soft-delete a participant from a session and atomically wipe any
 * stage_room_members rows they hold across this session's stages. Sticky
 * by design — the participant cannot rejoin via the code path
 * (redeemJoinCodeAction's `removed_by_facilitator` branch). The
 * facilitator-of-record can re-issue an explicit email invite via
 * session_invitations to override the kick (handle_new_user clears
 * removed_at on conflict for those).
 *
 * Refusal codes:
 *   * `unauthenticated`           — no caller session
 *   * `not_facilitator`           — caller is not the session facilitator
 *                                   (or the session doesn't exist)
 *   * `cannot_remove_facilitator` — caller tried to remove themselves;
 *                                   facilitators self-remove via leave/
 *                                   delete-account flows, not the roster
 *   * `participant_not_found`     — no row in session_participants for
 *                                   that profile, even soft-deleted
 */
export async function removeParticipantAction(
  sessionId: string,
  profileId: string,
): Promise<RemoveParticipantResult> {
  const actor = await assertFacilitator(sessionId);
  if (!actor) {
    // Disambiguate unauthenticated vs not_facilitator so the UI can show
    // a sign-in nudge when relevant. The cheap re-check pattern mirrors
    // join-actions.ts (one extra auth.getUser() round-trip on the rare
    // refusal path).
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated' };
    return { ok: false, code: 'not_facilitator' };
  }
  if (profileId === actor) return { ok: false, code: 'cannot_remove_facilitator' };

  const service = getServiceSupabaseClient();
  const existingRes = await service
    .from('session_participants')
    .select('removed_at')
    .eq('session_id', sessionId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existingRes.error) {
    throw new Error(`session_participants probe failed: ${existingRes.error.message}`);
  }
  if (!existingRes.data) return { ok: false, code: 'participant_not_found' };

  const updRes = await service
    .from('session_participants')
    .update({ removed_at: new Date().toISOString(), removed_by_profile_id: actor })
    .eq('session_id', sessionId)
    .eq('profile_id', profileId);
  if (updRes.error) {
    throw new Error(`session_participants update failed: ${updRes.error.message}`);
  }

  // Atomically clear from any stage_room_members rows in this session's
  // stages. If the participant is mid-canvas, the worker's RLS / can_edit_room
  // gate will drop their next WS upgrade — but the visible roster has to
  // reflect the kick immediately so the facilitator's mental model is right.
  const stagesRes = await service.from('stages').select('id').eq('session_id', sessionId);
  if (stagesRes.error) {
    throw new Error(`stages select failed: ${stagesRes.error.message}`);
  }
  const stageIds = (stagesRes.data ?? []).map((row) => row.id as string);
  if (stageIds.length > 0) {
    const delRes = await service
      .from('stage_room_members')
      .delete()
      .in('stage_id', stageIds)
      .eq('profile_id', profileId);
    if (delRes.error) {
      throw new Error(`stage_room_members delete failed: ${delRes.error.message}`);
    }
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

// ── restoreParticipantAction ────────────────────────────────────────────────

export type RestoreParticipantResult =
  | { ok: true }
  | { ok: false; code: 'unauthenticated' | 'not_facilitator' | 'participant_not_found' };

/**
 * Clear a soft-delete on session_participants — the facilitator-side undo
 * for an accidental kick. Does NOT restore stage_room_members assignments
 * (rooms are stage-scoped configuration; re-adding the participant to a
 * specific room is a separate manage-rooms step). Idempotent on
 * already-active rows (removed_at = null → removed_at = null, no-op).
 */
export async function restoreParticipantAction(
  sessionId: string,
  profileId: string,
): Promise<RestoreParticipantResult> {
  const actor = await assertFacilitator(sessionId);
  if (!actor) {
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated' };
    return { ok: false, code: 'not_facilitator' };
  }

  const service = getServiceSupabaseClient();
  const existingRes = await service
    .from('session_participants')
    .select('removed_at')
    .eq('session_id', sessionId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existingRes.error) {
    throw new Error(`session_participants probe failed: ${existingRes.error.message}`);
  }
  if (!existingRes.data) return { ok: false, code: 'participant_not_found' };

  const updRes = await service
    .from('session_participants')
    .update({ removed_at: null, removed_by_profile_id: null })
    .eq('session_id', sessionId)
    .eq('profile_id', profileId);
  if (updRes.error) {
    throw new Error(`session_participants update failed: ${updRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

// ── setSpotlightAction ──────────────────────────────────────────────────────

export type SetSpotlightResult =
  | { ok: true }
  | { ok: false; code: 'unauthenticated' | 'not_facilitator' | 'target_not_participant' };

/**
 * Point the session's spotlight at a participant's canvas, or clear it
 * (`targetProfileId = null`). Realtime-published via the existing
 * `sessions` publication (REPLICA IDENTITY FULL) so every participant's
 * banner updates without a refresh. The targeted profile must be an
 * active (non-removed) participant; soft-deleted rows refuse.
 */
export async function setSpotlightAction(
  sessionId: string,
  targetProfileId: string | null,
): Promise<SetSpotlightResult> {
  const actor = await assertFacilitator(sessionId);
  if (!actor) {
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated' };
    return { ok: false, code: 'not_facilitator' };
  }

  const service = getServiceSupabaseClient();
  if (targetProfileId !== null) {
    const partRes = await service
      .from('session_participants')
      .select('removed_at')
      .eq('session_id', sessionId)
      .eq('profile_id', targetProfileId)
      .is('removed_at', null)
      .maybeSingle();
    if (partRes.error) {
      throw new Error(`session_participants probe failed: ${partRes.error.message}`);
    }
    if (!partRes.data) return { ok: false, code: 'target_not_participant' };
  }

  const updRes = await service
    .from('sessions')
    .update({ spotlight_target_profile_id: targetProfileId })
    .eq('id', sessionId);
  if (updRes.error) {
    throw new Error(`sessions update failed: ${updRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

// ── resolveSpotlightTargetModelAction ───────────────────────────────────────

export type ResolveSpotlightTargetResult =
  | { ok: true; modelUrl: string | null }
  | { ok: false; code: 'unauthenticated' | 'no_current_stage' };

/**
 * Resolve the target participant's canvas on the session's current stage,
 * for the spotlight banner's "Open <name>'s model" affordance. Returns a
 * relative URL ready to drop into a <Link href={...}> or null when the
 * target has no model yet for this stage. Allowed for any signed-in
 * caller — the banner surfaces to every viewer, not just the facilitator.
 *
 * Failure codes:
 *   * `unauthenticated`   — no caller session
 *   * `no_current_stage`  — sessions.current_stage_id is NULL (the
 *                           spotlight has nothing to point at yet)
 */
export async function resolveSpotlightTargetModelAction(
  sessionId: string,
  targetProfileId: string,
): Promise<ResolveSpotlightTargetResult> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const service = getServiceSupabaseClient();
  const sessRes = await service
    .from('sessions')
    .select('current_stage_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessRes.error) {
    throw new Error(`sessions select failed: ${sessRes.error.message}`);
  }
  const currentStageId = sessRes.data?.current_stage_id ?? null;
  if (!currentStageId) return { ok: false, code: 'no_current_stage' };

  // Per-participant canvas lookup. Filter `deleted_at IS NULL` so a
  // trashed model doesn't get surfaced. We do NOT filter on `room_id` —
  // the spotlight follows the participant onto whichever canvas they're
  // editing, room-backed or personal. If a participant happens to own
  // multiple canvases on this stage (legacy data), we just take the
  // most recently updated one.
  const modelRes = await service
    .from('models')
    .select('id, updated_at')
    .eq('session_id', sessionId)
    .eq('stage_id', currentStageId)
    .eq('owner_profile_id', targetProfileId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (modelRes.error) {
    throw new Error(`models select failed: ${modelRes.error.message}`);
  }

  const modelId = modelRes.data?.id as string | undefined;
  return {
    ok: true,
    modelUrl: modelId ? `/app/designs/${modelId}` : null,
  };
}
