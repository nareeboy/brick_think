import { getServiceSupabaseClient } from '@/lib/db/service';
import { createServerSupabaseClient } from '@/lib/db/server';

export const FACILITATOR_NOTES_MAX = 8000;

/**
 * The ONLY function that ever projects `facilitator_notes` from `sessions`.
 * Returns null when the caller is not the session's facilitator.
 */
export async function getFacilitatorNotes(sessionId: string): Promise<string | null> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return null;
  const service = getServiceSupabaseClient();
  const { data } = await service
    .from('sessions')
    .select('facilitator_id, facilitator_notes')
    .eq('id', sessionId)
    .maybeSingle();
  if (!data || data.facilitator_id !== user.id) return null;
  return data.facilitator_notes ?? null;
}
