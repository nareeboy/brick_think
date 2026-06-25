'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { publicOriginFromHeaders } from '@/lib/http/publicOrigin';

// Facilitator-only roster surface (Spec A, Task 7). Companion to the
// participant-side join surface (join-actions.ts). All four actions gate
// on "caller is the session's facilitator"; writes flow through the
// service-role client because RLS on session_participants doesn't grant
// any INSERT/UPDATE/DELETE policies (writes only happen via these
// actions, join-actions.ts, and handle_new_user invite claims).
//
// getSpotlightBannerAction is the one outlier: it's a read for any
// signed-in viewer (the spotlight banner is shown to everyone), resolving
// the spotlit canvas into banner copy rather than mutating anything.

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
  | { ok: false; code: 'unauthenticated' | 'not_facilitator' | 'target_not_in_session' };

/**
 * Point the session's spotlight at a *canvas* (`models` row), or clear it
 * (`targetModelId = null`). Realtime-published via the existing `sessions`
 * publication (REPLICA IDENTITY FULL) so every viewer's banner updates
 * without a refresh.
 *
 * The spotlight targets a model rather than a participant so it works on
 * every stage type — a participant's per-stage canvas (`p.id` in the
 * Participants panel) AND a room canvas (`room.modelId` in the Rooms panel,
 * owned by the facilitator) — and stays valid after a stage finishes or the
 * session ends (it no longer depends on the current stage). A valid target
 * is any non-deleted model belonging to this session.
 */
export async function setSpotlightAction(
  sessionId: string,
  targetModelId: string | null,
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
  if (targetModelId !== null) {
    const modelRes = await service
      .from('models')
      .select('id')
      .eq('id', targetModelId)
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .maybeSingle();
    if (modelRes.error) {
      throw new Error(`models probe failed: ${modelRes.error.message}`);
    }
    if (!modelRes.data) return { ok: false, code: 'target_not_in_session' };
  }

  const updRes = await service
    .from('sessions')
    .update({ spotlight_target_model_id: targetModelId })
    .eq('id', sessionId);
  if (updRes.error) {
    throw new Error(`sessions update failed: ${updRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

// ── getSpotlightBannerAction ────────────────────────────────────────────────

export interface SpotlightBannerState {
  /** Spotlit canvas id; the banner's "Open it" navigates to its design page. */
  modelId: string;
  /** Relative URL for the spotlit canvas. */
  url: string;
  /** Who/what is being shown: a participant's display name, or a room title. */
  presenterLabel: string;
  /** True when the canvas is a room (label is a room title, not a person). */
  isRoom: boolean;
  /** Facilitator display name, for the "<facilitator> is showing …" sentence. */
  facilitatorName: string;
}

/**
 * Resolve the session's current spotlight into everything the banner needs to
 * render, or `null` when the banner should be hidden for the calling viewer.
 * Allowed for any signed-in caller — the banner surfaces to every viewer.
 *
 * Hidden (returns null) when: no spotlight set, the spotlit model is missing /
 * deleted / from another session, the viewer is the facilitator, or — for a
 * personal canvas — the viewer is its owner (they're already on it). Room
 * canvases are owned by the facilitator, so room members still see the banner
 * (clicking "Open it" is a harmless no-op if they're already there).
 */
export async function getSpotlightBannerAction(
  sessionId: string,
): Promise<SpotlightBannerState | null> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return null;

  const service = getServiceSupabaseClient();
  const sessRes = await service
    .from('sessions')
    .select('facilitator_id, spotlight_target_model_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessRes.error) {
    throw new Error(`sessions select failed: ${sessRes.error.message}`);
  }
  const facilitatorId = sessRes.data?.facilitator_id ?? null;
  const modelId = sessRes.data?.spotlight_target_model_id ?? null;
  if (!modelId) return null;
  // The facilitator drives the spotlight — they don't need the banner.
  if (facilitatorId && user.id === facilitatorId) return null;

  const modelRes = await service
    .from('models')
    .select('id, room_id, owner_profile_id')
    .eq('id', modelId)
    .eq('session_id', sessionId)
    .is('deleted_at', null)
    .maybeSingle();
  if (modelRes.error) {
    throw new Error(`models select failed: ${modelRes.error.message}`);
  }
  if (!modelRes.data) return null;
  const roomId = modelRes.data.room_id as string | null;
  const ownerProfileId = modelRes.data.owner_profile_id as string | null;
  const isRoom = roomId !== null;

  // Personal canvas: the owner is already on it, so hide their own banner.
  if (!isRoom && ownerProfileId && user.id === ownerProfileId) return null;

  const facilitatorName = await resolveProfileName(service, facilitatorId, 'Facilitator');

  let presenterLabel: string;
  if (isRoom) {
    const roomRes = await service
      .from('stage_rooms')
      .select('title, position')
      .eq('id', roomId as string)
      .maybeSingle();
    if (roomRes.error) {
      throw new Error(`stage_rooms select failed: ${roomRes.error.message}`);
    }
    const title = roomRes.data?.title?.trim();
    presenterLabel = title || `Room ${(roomRes.data?.position ?? 0) + 1}`;
  } else {
    presenterLabel = await resolveProfileName(service, ownerProfileId, 'A participant');
  }

  return {
    modelId,
    url: `/app/designs/${modelId}`,
    presenterLabel,
    isRoom,
    facilitatorName,
  };
}

/** Resolve a profile id to a display name (full name → email → fallback). */
async function resolveProfileName(
  service: ReturnType<typeof getServiceSupabaseClient>,
  profileId: string | null,
  fallback: string,
): Promise<string> {
  if (!profileId) return fallback;
  const { data, error } = await service
    .from('profiles')
    .select('full_name, email')
    .eq('id', profileId)
    .maybeSingle();
  if (error) {
    throw new Error(`profiles select failed: ${error.message}`);
  }
  const name = data?.full_name?.trim();
  if (name) return name;
  if (data?.email) return data.email;
  return fallback;
}

// ── inviteParticipantsByEmailAction ─────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_CAP = 25;

/** Per-email outcome surfaced back to the caller for inline status display. */
export type InviteStatus =
  | 'sent_invite'
  | 'sent_magiclink'
  | 'duplicate'
  | 'invalid_email'
  | 'already_member'
  | 'failed';

export type InviteParticipantsByEmailResult =
  | { ok: true; results: Array<{ email: string; status: InviteStatus }> }
  | { ok: false; code: 'unauthenticated' | 'not_facilitator' | 'over_cap' };

/**
 * Send Supabase-templated invite emails (or magic-link sign-ins, for
 * already-registered users) to a batch of addresses. Branches per-email:
 *
 *   * existing profile + active participant     → `already_member` (no send)
 *   * existing profile + not yet a participant  → `signInWithOtp` (magic link
 *                                                 lands on the session's join
 *                                                 URL so the trigger inserts
 *                                                 them); writes a
 *                                                 `session_invitations` audit
 *                                                 row anyway so the roster
 *                                                 panel can show "invited"
 * * no profile                                  → `auth.admin.inviteUserByEmail`
 *                                                 (Supabase's invite template),
 *                                                 plus the audit row
 *
 * Audit-row inserts swallow 23505 — the unique-open-invite index makes a
 * resend on an already-open invite a no-op, which is the intended idempotency.
 *
 * Refusal codes:
 *   * `unauthenticated`  — no caller session
 *   * `not_facilitator`  — caller is not the session facilitator
 *   * `over_cap`         — batch exceeded INVITE_CAP (25); UI splits earlier
 */
export async function inviteParticipantsByEmailAction(
  sessionId: string,
  emails: string[],
): Promise<InviteParticipantsByEmailResult> {
  const actor = await assertFacilitator(sessionId);
  if (!actor) {
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated' };
    return { ok: false, code: 'not_facilitator' };
  }
  if (emails.length > INVITE_CAP) return { ok: false, code: 'over_cap' };

  const service = getServiceSupabaseClient();
  const { data: session, error: sessionErr } = await service
    .from('sessions')
    .select('join_code')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr) {
    throw new Error(
      `inviteParticipantsByEmailAction sessions select failed: ${sessionErr.message}`,
    );
  }
  if (!session?.join_code) {
    // Defensive: post-backfill every session has a join_code, but if a
    // future code path drops it (or this is reached during a partial
    // migration), refuse without throwing — the UI surfaces all-failed.
    return {
      ok: true,
      results: emails.map((email) => ({ email, status: 'failed' as InviteStatus })),
    };
  }
  // Send-side URL for the magic_link / invite email templates. We route
  // through /auth/confirm so the token_hash works even when the invitee
  // opens the email in a different browser than the facilitator that sent
  // it (always the case for cross-user invites). next= lands them on the
  // join page after verifyOtp succeeds.
  const origin = publicOriginFromHeaders(await headers());
  const confirmRedirect = `${origin}/auth/confirm?next=${encodeURIComponent(
    `/app/join/${session.join_code}`,
  )}`;

  const seen = new Set<string>();
  const results: Array<{ email: string; status: InviteStatus }> = [];

  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      results.push({ email: raw, status: 'invalid_email' });
      continue;
    }
    if (seen.has(email)) {
      results.push({ email, status: 'duplicate' });
      continue;
    }
    seen.add(email);

    // citext column → case-insensitive match. Service-role read because
    // the user-scoped client can't see profiles outside shared orgs.
    const { data: profile, error: profileErr } = await service
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (profileErr) {
      console.error('inviteParticipantsByEmailAction: profiles lookup failed', {
        email,
        error: profileErr,
      });
      results.push({ email, status: 'failed' });
      continue;
    }

    let perEmailStatus: InviteStatus;

    if (profile) {
      // Existing account: check membership first. An active participant
      // gets `already_member` (no email send, no audit row).
      const { data: existing, error: partErr } = await service
        .from('session_participants')
        .select('removed_at')
        .eq('session_id', sessionId)
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (partErr) {
        console.error('inviteParticipantsByEmailAction: session_participants probe failed', {
          email,
          error: partErr,
        });
        results.push({ email, status: 'failed' });
        continue;
      }
      if (existing && !existing.removed_at) {
        results.push({ email, status: 'already_member' });
        continue;
      }

      // Magic-link sign-in for the existing user. The redirect lands on
      // /auth/confirm which verifyOtp's the token_hash and then forwards
      // to the join URL. shouldCreateUser: false because we already know
      // this email has a profile — defensive against a stray Supabase
      // upsert.
      const { error: otpErr } = await service.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: confirmRedirect, shouldCreateUser: false },
      });
      if (otpErr) {
        console.error('inviteParticipantsByEmailAction: signInWithOtp failed', {
          email,
          error: otpErr,
        });
        results.push({ email, status: 'failed' });
        continue;
      }
      perEmailStatus = 'sent_magiclink';
    } else {
      // No profile yet: Supabase Auth's invite template handles delivery.
      // Route through /auth/confirm so the invitee can open the email on
      // any device/browser without tripping the PKCE verifier check.
      const { error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
        redirectTo: confirmRedirect,
      });
      if (inviteErr) {
        console.error('inviteParticipantsByEmailAction: inviteUserByEmail failed', {
          email,
          error: inviteErr,
        });
        results.push({ email, status: 'failed' });
        continue;
      }
      perEmailStatus = 'sent_invite';
    }

    // Audit row. The unique-open-invite partial index makes this idempotent
    // for resends — surface 23505 as a benign no-op (the open invite already
    // exists and will be cleared by handle_new_user on claim).
    const { error: inviteInsertError } = await service
      .from('session_invitations')
      .insert({ session_id: sessionId, email, invited_by: actor });
    if (inviteInsertError && (inviteInsertError as { code?: string }).code !== '23505') {
      console.error('inviteParticipantsByEmailAction: invitation insert failed', {
        email,
        error: inviteInsertError,
      });
      // The email already went out; the audit row failed. Surface as failed
      // so the UI can prompt a retry rather than silently dropping the row.
      results.push({ email, status: 'failed' });
      continue;
    }

    results.push({ email, status: perEmailStatus });
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true, results };
}

// ── cancelInvitationAction ──────────────────────────────────────────────────

export type CancelInvitationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'unauthenticated' | 'not_facilitator' | 'invitation_not_found' | 'already_claimed';
    };

/**
 * Hard-delete a pending invitation. Refuses on a claimed invite (the
 * participant has already redeemed it; cancellation now would be misleading
 * — the facilitator should `removeParticipantAction` instead).
 */
export async function cancelInvitationAction(
  invitationId: string,
): Promise<CancelInvitationResult> {
  const service = getServiceSupabaseClient();
  const inviteRes = await service
    .from('session_invitations')
    .select('session_id, claimed_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (inviteRes.error) {
    throw new Error(`session_invitations select failed: ${inviteRes.error.message}`);
  }
  if (!inviteRes.data) return { ok: false, code: 'invitation_not_found' };
  if (inviteRes.data.claimed_at) return { ok: false, code: 'already_claimed' };

  const sessionId = inviteRes.data.session_id as string;
  const actor = await assertFacilitator(sessionId);
  if (!actor) {
    const userSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated' };
    return { ok: false, code: 'not_facilitator' };
  }

  const delRes = await service.from('session_invitations').delete().eq('id', invitationId);
  if (delRes.error) {
    throw new Error(`session_invitations delete failed: ${delRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

// ── resendInvitationAction ──────────────────────────────────────────────────

export type ResendInvitationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'unauthenticated'
        | 'not_facilitator'
        | 'invitation_not_found'
        | 'already_claimed'
        | 'failed';
    };

/**
 * Re-send a pending invitation by replaying the same email through
 * `inviteParticipantsByEmailAction`. The unique-open-invite partial index
 * keeps the audit row idempotent (23505 → no-op). Refuses on a claimed
 * invite (already redeemed) and on the same auth + facilitator gates as
 * the underlying action.
 */
export async function resendInvitationAction(
  invitationId: string,
): Promise<ResendInvitationResult> {
  const service = getServiceSupabaseClient();
  const inviteRes = await service
    .from('session_invitations')
    .select('session_id, email, claimed_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (inviteRes.error) {
    throw new Error(`session_invitations select failed: ${inviteRes.error.message}`);
  }
  if (!inviteRes.data) return { ok: false, code: 'invitation_not_found' };
  if (inviteRes.data.claimed_at) return { ok: false, code: 'already_claimed' };

  const sessionId = inviteRes.data.session_id as string;
  const email = inviteRes.data.email as string;

  // The underlying action runs its own facilitator + unauthenticated gates,
  // so this branch only short-circuits on lookup failures above. Defer the
  // refusal mapping to the per-email status it returns.
  const send = await inviteParticipantsByEmailAction(sessionId, [email]);
  if (!send.ok) {
    if (send.code === 'unauthenticated') return { ok: false, code: 'unauthenticated' };
    if (send.code === 'not_facilitator') return { ok: false, code: 'not_facilitator' };
    return { ok: false, code: 'failed' };
  }
  const perEmail = send.results[0];
  if (!perEmail) return { ok: false, code: 'failed' };
  if (
    perEmail.status === 'sent_invite' ||
    perEmail.status === 'sent_magiclink' ||
    perEmail.status === 'already_member'
  ) {
    // already_member surfaces as ok because the participant has effectively
    // already joined — the resend was a no-op against a now-redundant audit
    // row but there's nothing more to do.
    return { ok: true };
  }
  return { ok: false, code: 'failed' };
}
