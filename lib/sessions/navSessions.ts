import type { SupabaseClient } from '@supabase/supabase-js';

/** Session statuses where an attendee still has a session to walk into. */
const ACTIVE_SESSION_STATUSES = ['draft', 'scheduled', 'live'] as const;

export interface NavSession {
  id: string;
  title: string;
}

// The embedded `sessions` relation is many-to-one, but the Supabase client
// types it loosely; normalise object-or-array so callers get a flat shape.
interface ParticipantRow {
  sessions:
    | { id: string; title: string | null; status: string }
    | { id: string; title: string | null; status: string }[]
    | null;
}

function normaliseSession(row: ParticipantRow): NavSession | null {
  const s = Array.isArray(row.sessions) ? row.sessions[0] : row.sessions;
  if (!s) return null;
  return { id: s.id, title: s.title?.trim() || 'Untitled session' };
}

/**
 * The user's active, non-removed attended sessions, for the header nav.
 * Active = status in draft/scheduled/live. RLS does the authorisation:
 * the "self read" policy on session_participants exposes the user's own
 * rows, and the is_session_participant OR-branch on sessions exposes the
 * embedded session. Facilitators are never in session_participants, so this
 * is purely the attendee shortcut.
 */
export async function getMyActiveSessionsForNav(
  supabase: SupabaseClient,
  userId: string,
): Promise<NavSession[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('sessions!inner(id, title, status)')
    .eq('profile_id', userId)
    .is('removed_at', null)
    .in('sessions.status', ACTIVE_SESSION_STATUSES as unknown as string[]);

  if (error || !data) return [];
  return (data as unknown as ParticipantRow[])
    .map(normaliseSession)
    .filter((s): s is NavSession => s !== null);
}
