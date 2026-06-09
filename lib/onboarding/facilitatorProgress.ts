import type { FacilitatorChecklistProgress } from '@/components/onboarding/FacilitatorChecklist';
import type { createServerSupabaseClient } from '@/lib/db/server';

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

interface Options {
  /**
   * Pre-fetched org ids for the caller, name-sorted. Pass this when the page
   * has already loaded the user's org memberships (e.g. My Designs) so the
   * helper skips its own membership query. When omitted, the helper resolves
   * the user's orgs itself.
   */
  orgIds?: string[];
  /** First org id (name-sorted) — paired with `orgIds`. */
  firstOrgId?: string | null;
}

/**
 * Single source of truth for the facilitator onboarding checklist state.
 *
 * Computes the three "first session" milestones (own an org → have a session
 * in it → have started a session-scoped model) plus the "next click"
 * destinations. Used by both `/app/my-designs` and `/app/sessions/[id]` so the
 * walkthrough container stays in sync wherever the user lands.
 *
 * RLS-scoped: pass the request's user-scoped client and the authed user id.
 */
export async function computeFacilitatorChecklistProgress(
  supabase: ServerSupabaseClient,
  userId: string,
  opts?: Options,
): Promise<FacilitatorChecklistProgress> {
  let orgIds = opts?.orgIds;
  let firstOrgId = opts?.firstOrgId ?? null;

  if (orgIds === undefined) {
    const membershipsRes = await supabase
      .from('org_memberships')
      .select('organisations:org_id ( id, name )')
      .eq('profile_id', userId);
    if (membershipsRes.error) {
      throw new Error(`Onboarding org check failed: ${membershipsRes.error.message}`);
    }
    const sortedOrgs = (membershipsRes.data ?? [])
      .map((row) => (row as { organisations: { id: string; name: string } | null }).organisations)
      .filter((o): o is { id: string; name: string } => o !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    orgIds = sortedOrgs.map((o) => o.id);
    firstOrgId = sortedOrgs[0]?.id ?? null;
  }

  const orgCount = orgIds.length;
  const hasOrg = orgCount > 0;

  let hasSessionInAnyOrg = false;
  let firstSessionId: string | null = null;
  let sessionCount = 0;
  if (orgIds.length > 0) {
    const sessionRes = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .in('org_id', orgIds)
      .order('created_at', { ascending: true })
      .limit(1);
    if (sessionRes.error) {
      throw new Error(`Onboarding session check failed: ${sessionRes.error.message}`);
    }
    sessionCount = sessionRes.count ?? 0;
    const first = sessionRes.data?.[0];
    if (first) {
      hasSessionInAnyOrg = true;
      firstSessionId = first.id;
    }
  }

  const designRes = await supabase
    .from('models')
    .select('id', { head: true, count: 'exact' })
    .eq('owner_profile_id', userId)
    .not('session_id', 'is', null)
    .is('deleted_at', null)
    .limit(1);
  if (designRes.error) {
    throw new Error(`Onboarding design check failed: ${designRes.error.message}`);
  }
  const ownedSessionDesignCount = designRes.count ?? 0;
  const hasOwnedSessionDesign = ownedSessionDesignCount > 0;

  return {
    hasOrg,
    hasSessionInAnyOrg,
    hasOwnedSessionDesign,
    firstOrgId,
    firstSessionId,
    orgCount,
    sessionCount,
    ownedSessionDesignCount,
  };
}
