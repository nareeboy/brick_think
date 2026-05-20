'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { dispatchParticipantJoinedNotification } from '@/lib/notifications/dispatch';
import { isValidJoinCodeShape } from '@/lib/sessions/joinCode';

// Redemption flow for the 6-char Crockford-base32 `sessions.join_code`
// surface (Spec A, Task 3). The write side flows through service-role
// because RLS on `session_participants` doesn't grant self-INSERT — writes
// only happen here, in invite-claim (handle_new_user), and in facilitator
// roster actions.
//
// Failure-code vocabulary follows scenario-actions.ts (`unauthenticated`,
// `not_facilitator`, etc.). Specific to this surface:
//   * `code_not_found`        — shape-invalid OR unknown after lookup. Both
//                               collapse into one code so the join page can
//                               render a single "we couldn't find that code"
//                               message without leaking shape-vs-existence.
//   * `session_completed`     — code is real but the session is over.
//   * `removed_by_facilitator`— caller has a soft-deleted participant row
//                               (sticky kick). Distinct so the join UI can
//                               explain "the facilitator removed you" rather
//                               than "we couldn't find that code".

export type RedeemJoinCodeResult =
  | { ok: true; sessionId: string }
  | {
      ok: false;
      code: 'unauthenticated' | 'code_not_found' | 'session_completed' | 'removed_by_facilitator';
    };

export async function redeemJoinCodeAction(code: string): Promise<RedeemJoinCodeResult> {
  // Shape check first — no DB round-trip on garbage input. We collapse
  // shape-invalid AND unknown-code into the same outward code so the join
  // page can't be used as a code-shape oracle.
  if (!isValidJoinCodeShape(code)) return { ok: false, code: 'code_not_found' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const svc = getServiceSupabaseClient();

  // Case-insensitive lookup via the SQL helper — the function upper()'s the
  // input so the unique btree on join_code stays usable.
  const lookupRes = await svc.rpc('lookup_session_by_code', { p_code: code });
  if (lookupRes.error) {
    throw new Error(`lookup_session_by_code failed: ${lookupRes.error.message}`);
  }
  const session = Array.isArray(lookupRes.data) ? lookupRes.data[0] : null;
  if (!session) return { ok: false, code: 'code_not_found' };
  if (session.status === 'completed') return { ok: false, code: 'session_completed' };

  const profileId = user.id;
  const sessionId = session.id;

  // Existing-row probe distinguishes three branches:
  //   1. row with removed_at != null → sticky kick, refuse.
  //   2. row with removed_at == null → already joined, idempotent success
  //      with NO notification (notification only fires on fresh insert).
  //   3. no row → insert + fire one notification.
  const existingRes = await svc
    .from('session_participants')
    .select('removed_at')
    .eq('session_id', sessionId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existingRes.error) {
    throw new Error(`session_participants probe failed: ${existingRes.error.message}`);
  }
  const existing = existingRes.data;

  if (existing?.removed_at) return { ok: false, code: 'removed_by_facilitator' };

  if (!existing) {
    const insertRes = await svc.from('session_participants').insert({
      session_id: sessionId,
      profile_id: profileId,
    });

    if (insertRes.error) {
      // 23505 unique_violation = lost the race with another concurrent
      // redeem (or the handle_new_user invite claim). Treat as
      // already-joined; do NOT fire a duplicate notification — the
      // winning insert already fired one (or, in the invite case, the
      // session_invitation_claimed notification fired instead).
      const pgCode = (insertRes.error as { code?: string }).code;
      if (pgCode !== '23505') {
        throw new Error(`session_participants insert failed: ${insertRes.error.message}`);
      }
    } else {
      // Fresh insert: notify the facilitator. Best-effort — a notification
      // failure should not roll back the join. The facilitator id + title
      // were already pre-loaded by lookup_session_by_code, but it returns
      // facilitator_full_name (display) not facilitator_id, so a small
      // follow-up select is needed for the recipient + payload.
      const sessionRowRes = await svc
        .from('sessions')
        .select('facilitator_id, title')
        .eq('id', sessionId)
        .single();
      if (sessionRowRes.error) {
        // Should not happen — we just resolved the row via the RPC. Log
        // and continue without notifying.
        console.error('redeemJoinCodeAction: sessions read after insert failed', sessionRowRes.error);
      } else if (sessionRowRes.data?.facilitator_id) {
        const facilitatorId = sessionRowRes.data.facilitator_id;
        const sessionTitle = sessionRowRes.data.title;

        const profileRes = await svc
          .from('profiles')
          .select('full_name, email')
          .eq('id', profileId)
          .single();
        const profile = profileRes.data;

        await dispatchParticipantJoinedNotification({
          sessionId,
          sessionTitle,
          facilitatorId,
          joinerProfileId: profileId,
          joinerFullName: profile?.full_name ?? null,
          joinerEmail: profile?.email ?? null,
        });
      }
    }
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true, sessionId };
}
