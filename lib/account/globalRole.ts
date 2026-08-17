import type { createServerSupabaseClient } from '@/lib/db/server';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * App-wide identity for the header role chip — distinct from the per-session
 * role on `/app/sessions/[id]` (SessionRoleChip), which is scoped to a single
 * session's `facilitator_id`.
 */
export type GlobalRole = 'facilitator' | 'guest';

/** Org roles that put a user on the organising side of workshops. */
const ELEVATED_ORG_ROLES = ['owner', 'admin', 'facilitator'] as const;

/**
 * Pure decision core, split out for unit testing: a user is a facilitator
 * when they run at least one session or hold an elevated org role; everyone
 * else — invited session participants and brand-new accounts — is a guest.
 */
export function resolveGlobalRole(input: {
  facilitatesAnySession: boolean;
  hasElevatedOrgRole: boolean;
}): GlobalRole {
  return input.facilitatesAnySession || input.hasElevatedOrgRole ? 'facilitator' : 'guest';
}

/**
 * Resolve the signed-in user's global role for the header chip.
 *
 * RLS-scoped: pass the request's user-scoped client and the authed user id.
 * Both probes are existence checks (`limit(1)`) and run in parallel; the
 * self-read policies on `sessions` and `org_memberships` cover them.
 */
export async function getGlobalRole(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<GlobalRole> {
  const [sessionRes, membershipRes] = await Promise.all([
    supabase.from('sessions').select('id').eq('facilitator_id', userId).limit(1),
    supabase
      .from('org_memberships')
      .select('role')
      .eq('profile_id', userId)
      .in('role', [...ELEVATED_ORG_ROLES])
      .limit(1),
  ]);

  if (sessionRes.error) {
    throw new Error(`Global role session probe failed: ${sessionRes.error.message}`);
  }
  if (membershipRes.error) {
    throw new Error(`Global role membership probe failed: ${membershipRes.error.message}`);
  }

  return resolveGlobalRole({
    facilitatesAnySession: (sessionRes.data ?? []).length > 0,
    hasElevatedOrgRole: (membershipRes.data ?? []).length > 0,
  });
}
