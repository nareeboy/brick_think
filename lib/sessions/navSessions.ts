import type { SupabaseClient } from '@supabase/supabase-js';

/** Session statuses where an attendee still has a session to walk into. */
const ACTIVE_SESSION_STATUSES = ['draft', 'scheduled', 'live'] as const;

export interface NavSession {
  id: string;
  title: string;
}

interface SessionShape {
  id: string;
  title: string | null;
  status: string;
}

function toNavSession(s: SessionShape): NavSession {
  return { id: s.id, title: s.title?.trim() || 'Untitled session' };
}

/**
 * The sessions to surface in the header "Session" link, for the given user.
 *
 * A session shows when EITHER:
 *  (a) the user is an active joined participant of it (a row in
 *      session_participants with removed_at IS NULL) and it is in an active
 *      state (draft / scheduled / live) — the explicit-attendee path; or
 *  (b) the user is a member of the session's org and the session is LIVE —
 *      team members are attendees too, so a running session surfaces the link
 *      for the whole org. The facilitator is excluded from this path: they
 *      reach their own sessions via Organisations.
 *
 * The two paths are unioned and de-duplicated by session id. RLS does the
 * authorisation throughout: the self-read policy on session_participants, the
 * is_session_participant / org-member OR-branches on sessions, and the
 * is_org_member self-read on org_memberships.
 */
export async function getMyActiveSessionsForNav(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavSession[]> {
  const byId = new Map<string, NavSession>();

  // (a) Sessions the user has explicitly joined, in any active state.
  const participantRes = await supabase
    .from('session_participants')
    .select('sessions!inner(id, title, status)')
    .eq('profile_id', userId)
    .is('removed_at', null)
    .in('sessions.status', [...ACTIVE_SESSION_STATUSES]);

  if (!participantRes.error && participantRes.data) {
    const rows = participantRes.data as unknown as Array<{
      sessions: SessionShape | SessionShape[] | null;
    }>;
    for (const row of rows) {
      const s = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
      if (s) byId.set(s.id, toNavSession(s));
    }
  }

  // (b) Live sessions in the user's orgs that they do not facilitate.
  const membershipRes = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('profile_id', userId);
  const orgIds = (membershipRes.data ?? []).map((m) => m.org_id as string);

  if (orgIds.length > 0) {
    const orgSessionsRes = await supabase
      .from('sessions')
      .select('id, title, status, facilitator_id')
      .in('org_id', orgIds)
      .eq('status', 'live');

    if (!orgSessionsRes.error && orgSessionsRes.data) {
      const rows = orgSessionsRes.data as Array<SessionShape & { facilitator_id: string | null }>;
      for (const s of rows) {
        if (s.facilitator_id === userId) continue; // facilitators navigate via Orgs
        if (!byId.has(s.id)) byId.set(s.id, toNavSession(s));
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}
