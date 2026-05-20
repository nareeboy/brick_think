'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { FACILITATOR_NOTES_MAX } from '@/lib/sessions/facilitatorNotes';

export type UpdateFacilitatorNotesResult =
  | { ok: true }
  | { ok: false; code: 'unauthenticated' | 'not_facilitator' | 'over_cap' | 'session_not_found' };

export async function updateFacilitatorNotesAction(
  sessionId: string,
  notes: string | null,
): Promise<UpdateFacilitatorNotesResult> {
  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const normalised = notes && notes.trim().length > 0 ? notes : null;
  if (normalised && normalised.length > FACILITATOR_NOTES_MAX) {
    return { ok: false, code: 'over_cap' };
  }

  const service = getServiceSupabaseClient();
  const { data: session } = await service
    .from('sessions')
    .select('facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return { ok: false, code: 'session_not_found' };
  if (session.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };

  await service.from('sessions').update({ facilitator_notes: normalised }).eq('id', sessionId);
  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}
