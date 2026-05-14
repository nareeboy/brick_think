'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import { defaultModelTitle } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANONICAL_STAGE_TYPES: StageType[] = [
  'skill_building',
  'individual_model',
  'shared_model',
  'system_model',
  'guiding_principles',
];

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fsessions');
  return { supabase, user };
}

/**
 * Create a new session in the caller's active org. Auto-creates the five
 * canonical stages and redirects to the detail page.
 *
 * Permissions:
 * - Caller must have an active org (`profiles.active_org_id IS NOT NULL`).
 * - RLS on `sessions` insert allows the caller because `facilitator_id = me`.
 */
export async function createSession(formData: FormData): Promise<void> {
  const rawTitle = formData.get('title');
  const title =
    typeof rawTitle === 'string' ? rawTitle.trim().slice(0, 200) : '';
  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const { supabase, user } = await requireUser();

  const profileRes = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('id', user.id)
    .single();
  if (profileRes.error || !profileRes.data) {
    throw new Error(
      `Failed to load active org: ${profileRes.error?.message ?? 'unknown'}`,
    );
  }
  const orgId = profileRes.data.active_org_id;
  if (!orgId) {
    throw new Error(
      'You need an active organisation to create a session. Create or switch into an org first.',
    );
  }

  const sessionRes = await supabase
    .from('sessions')
    .insert({
      org_id: orgId,
      facilitator_id: user.id,
      title,
    })
    .select('id')
    .single();
  if (sessionRes.error || !sessionRes.data) {
    throw new Error(`Failed to create session: ${sessionRes.error?.message}`);
  }
  const sessionId = sessionRes.data.id;

  const stageRows = CANONICAL_STAGE_TYPES.map((stage_type, position) => ({
    session_id: sessionId,
    stage_type,
    position,
  }));
  const stagesRes = await supabase.from('stages').insert(stageRows);
  if (stagesRes.error) {
    throw new Error(`Failed to create stages: ${stagesRes.error.message}`);
  }

  revalidatePath('/app/sessions');
  redirect(`/app/sessions/${sessionId}`);
}

/**
 * Rename a session. RLS on `sessions` UPDATE grants facilitator + org admin
 * write access; non-authorised callers see the row disappear (no rows
 * updated) and we surface that as a clear error.
 */
export async function renameSession(
  sessionId: string,
  title: string,
): Promise<void> {
  if (!UUID_RE.test(sessionId)) {
    throw new Error('Invalid sessionId');
  }
  const trimmed = title.trim().slice(0, 200);
  if (trimmed.length === 0) {
    throw new Error('Title is required');
  }

  const { supabase } = await requireUser();

  const updateRes = await supabase
    .from('sessions')
    .update({ title: trimmed })
    .eq('id', sessionId)
    .select('id');
  if (updateRes.error) {
    throw new Error(`Failed to rename session: ${updateRes.error.message}`);
  }
  if (!updateRes.data || updateRes.data.length === 0) {
    throw new Error(
      'Session not found, or you do not have permission to rename it.',
    );
  }

  revalidatePath('/app/sessions');
  revalidatePath(`/app/sessions/${sessionId}`);
}

/**
 * Idempotent: if the caller already has an active model for (sessionId,
 * stageId), redirect to it; otherwise create and redirect to the new id.
 *
 * Security: the pre-SELECT of the parent session through the RLS-scoped
 * client is the authorization gate. Callers who aren't in session.org_id
 * receive a not-found-style error — no info leak about session existence.
 */
export async function createModelInStage(formData: FormData): Promise<void> {
  const sessionId = String(formData.get('sessionId') ?? '');
  const stageId = String(formData.get('stageId') ?? '');
  if (!UUID_RE.test(sessionId) || !UUID_RE.test(stageId)) {
    throw new Error('Invalid sessionId or stageId');
  }

  const { supabase, user } = await requireUser();

  // 1. Authorization gate: caller must be able to read the session.
  const sessionRes = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionRes.error) {
    throw new Error(`Session lookup failed: ${sessionRes.error.message}`);
  }
  if (!sessionRes.data) {
    // RLS hid it OR it doesn't exist — same outcome to avoid info leak.
    throw new Error('Session not found');
  }

  // 2. Stage lookup — needed for the default title, AND validates the stage
  //    belongs to the session (composite FK would also reject the INSERT, but
  //    this surfaces a clearer error and gives us stage_type for the title).
  const stageRes = await supabase
    .from('stages')
    .select('id, stage_type, session_id')
    .eq('id', stageId)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (stageRes.error || !stageRes.data) {
    throw new Error('Stage not found in this session');
  }
  const stageType = stageRes.data.stage_type as StageType;

  // 3. Idempotency check — existing active model for this triple?
  const existingRes = await supabase
    .from('models')
    .select('id')
    .eq('session_id', sessionId)
    .eq('stage_id', stageId)
    .eq('owner_profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (existingRes.error) {
    throw new Error(`Existing-model lookup failed: ${existingRes.error.message}`);
  }
  if (existingRes.data) {
    revalidatePath(`/app/sessions/${sessionId}`);
    redirect(`/app/designs/${existingRes.data.id}`);
  }

  // 4. Insert. On 23505 unique violation (concurrent double-submit race),
  //    fall back to a re-SELECT and redirect to the winner.
  const insertRes = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: defaultModelTitle(stageType),
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
      session_id: sessionId,
      stage_id: stageId,
    })
    .select('id')
    .single();
  if (insertRes.error) {
    if (insertRes.error.code === '23505') {
      const winnerRes = await supabase
        .from('models')
        .select('id')
        .eq('session_id', sessionId)
        .eq('stage_id', stageId)
        .eq('owner_profile_id', user.id)
        .is('deleted_at', null)
        .single();
      if (winnerRes.error || !winnerRes.data) {
        throw new Error(
          `Insert race-recovery failed: ${winnerRes.error?.message ?? 'no winner'}`,
        );
      }
      revalidatePath(`/app/sessions/${sessionId}`);
      redirect(`/app/designs/${winnerRes.data.id}`);
    }
    throw new Error(`Failed to create model: ${insertRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  redirect(`/app/designs/${insertRes.data.id}`);
}

/**
 * Hard-delete a session-scoped model. Personal/org-shared models continue to
 * go through /app/designs/actions.ts soft-delete; this action refuses them.
 *
 * RLS grants DELETE to owner OR facilitator-of-session OR org-admin.
 */
export async function deleteSessionModel(modelId: string): Promise<void> {
  if (!UUID_RE.test(modelId)) {
    throw new Error('Invalid modelId');
  }

  const { supabase } = await requireUser();

  // 1. Pre-fetch session_id so we can refuse non-session rows AND know where
  //    to redirect after delete.
  const modelRes = await supabase
    .from('models')
    .select('id, session_id')
    .eq('id', modelId)
    .maybeSingle();
  if (modelRes.error) {
    throw new Error(`Model lookup failed: ${modelRes.error.message}`);
  }
  if (!modelRes.data) {
    throw new Error('Model not found');
  }
  if (modelRes.data.session_id === null) {
    throw new Error(
      'This action is for session-scoped models only. Use deleteModelAction for personal/org models.',
    );
  }
  const sessionId = modelRes.data.session_id;

  // 2. Hard delete.
  const delRes = await supabase
    .from('models')
    .delete()
    .eq('id', modelId)
    .select('id');
  if (delRes.error) {
    throw new Error(`Failed to delete model: ${delRes.error.message}`);
  }
  if (!delRes.data || delRes.data.length === 0) {
    throw new Error('Model not found or not authorised to delete');
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  redirect(`/app/sessions/${sessionId}`);
}
