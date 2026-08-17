import type { createServerSupabaseClient } from '@/lib/db/server';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Org roles that put a user on the organising side of workshops. */
const ELEVATED_ORG_ROLES = ['owner', 'admin', 'facilitator'] as const;

/**
 * Pure decision core, split out for unit testing.
 *
 * A "tutorial guest" is someone who was invited into somebody else's session
 * and has no organising footprint of their own — they should never see the
 * getting-started tutorial modal (its three pathways are facilitator work).
 * A brand-new account with NO session participation is NOT a guest: it has no
 * signals either way, and the modal is exactly what it's for.
 */
export function resolveTutorialGuest(input: {
  participatesInAnySession: boolean;
  facilitatesAnySession: boolean;
  hasElevatedOrgRole: boolean;
}): boolean {
  return (
    input.participatesInAnySession && !input.facilitatesAnySession && !input.hasElevatedOrgRole
  );
}

/**
 * Resolve whether the signed-in user is a tutorial guest.
 *
 * RLS-scoped: pass the request's user-scoped client and the authed user id.
 * All three probes are existence checks (`limit(1)`) run in parallel; the
 * self-read policies on `session_participants`, `sessions`, and
 * `org_memberships` cover them.
 */
export async function isTutorialGuest(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<boolean> {
  const [participantRes, sessionRes, membershipRes] = await Promise.all([
    supabase.from('session_participants').select('session_id').eq('profile_id', userId).limit(1),
    supabase.from('sessions').select('id').eq('facilitator_id', userId).limit(1),
    supabase
      .from('org_memberships')
      .select('role')
      .eq('profile_id', userId)
      .in('role', [...ELEVATED_ORG_ROLES])
      .limit(1),
  ]);

  if (participantRes.error) {
    throw new Error(`Guest gate participant probe failed: ${participantRes.error.message}`);
  }
  if (sessionRes.error) {
    throw new Error(`Guest gate session probe failed: ${sessionRes.error.message}`);
  }
  if (membershipRes.error) {
    throw new Error(`Guest gate membership probe failed: ${membershipRes.error.message}`);
  }

  return resolveTutorialGuest({
    participatesInAnySession: (participantRes.data ?? []).length > 0,
    facilitatesAnySession: (sessionRes.data ?? []).length > 0,
    hasElevatedOrgRole: (membershipRes.data ?? []).length > 0,
  });
}
