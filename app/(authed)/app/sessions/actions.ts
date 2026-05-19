'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import type { Json } from '@/lib/db/types.generated';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import { STAGE_DEFAULT_DURATIONS_SECONDS, defaultModelTitle } from '@/lib/sessions/stage-labels';
import {
  CANONICAL_STAGE_TYPES,
  SESSION_MODES,
  SESSION_STATUSES,
  type SessionMode,
  type SessionStatus,
  type StageType,
} from '@/lib/sessions/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');
  return { supabase, user };
}

/**
 * Create a new session in a specific organisation. Auto-creates the five
 * canonical stages and redirects to the detail page.
 *
 * Permissions:
 * - Caller must pass the target `orgId` in form data and be a member of it.
 * - RLS on `sessions` insert allows the caller because `facilitator_id = me`.
 */
export async function createSession(formData: FormData): Promise<void> {
  const rawTitle = formData.get('title');
  const title = typeof rawTitle === 'string' ? rawTitle.trim().slice(0, 200) : '';
  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const rawOrgId = formData.get('orgId');
  const orgId = typeof rawOrgId === 'string' ? rawOrgId.trim() : '';
  if (!UUID_RE.test(orgId)) {
    throw new Error('Invalid orgId');
  }

  const { supabase, user } = await requireUser();

  // Defence-in-depth: confirm the caller is a member of the target org.
  // RLS on `sessions` insert would already reject non-members, but checking
  // here surfaces a clearer error.
  const memberRes = await supabase
    .from('org_memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('profile_id', user.id);
  if (memberRes.error) {
    throw new Error(`Membership check failed: ${memberRes.error.message}`);
  }
  if ((memberRes.count ?? 0) === 0) {
    throw new Error('You are not a member of that organisation');
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
    duration_seconds: STAGE_DEFAULT_DURATIONS_SECONDS[stage_type],
  }));
  const stagesRes = await supabase.from('stages').insert(stageRows);
  if (stagesRes.error) {
    throw new Error(`Failed to create stages: ${stagesRes.error.message}`);
  }

  revalidatePath(`/app/orgs/${orgId}`);
  redirect(`/app/sessions/${sessionId}`);
}

/**
 * Rename a session. RLS on `sessions` UPDATE grants facilitator + org admin
 * write access; non-authorised callers see the row disappear (no rows
 * updated) and we surface that as a clear error.
 */
export async function renameSession(sessionId: string, title: string): Promise<void> {
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
    throw new Error('Session not found, or you do not have permission to rename it.');
  }

  revalidatePath('/app/my-designs');
  revalidatePath(`/app/sessions/${sessionId}`);
}

/**
 * Idempotent: if an appropriate active model exists for (sessionId, stageId),
 * redirect to it; otherwise create and redirect to the new id.
 *
 * Stage-type semantics:
 * - `shared_model`: ONE model per (session, stage), shared by all
 *   participants. Owned by the session facilitator by convention so the
 *   existing (session, stage, owner) unique index acts as a (session, stage)
 *   constraint for this stage. Insert runs through the service-role client
 *   because the RLS INSERT policy insists owner = auth.uid(); any participant
 *   in the org may trigger the create, and the elevation is safe because the
 *   pre-SELECT of the session through the RLS-scoped client is the
 *   authorization gate.
 * - All other stages: one model per (session, stage, caller), idempotent on
 *   the caller as owner. Insert is the caller's own row via RLS.
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
  //    Capture facilitator_id for the shared_model elevated insert.
  const sessionRes = await supabase
    .from('sessions')
    .select('id, facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionRes.error) {
    throw new Error(`Session lookup failed: ${sessionRes.error.message}`);
  }
  if (!sessionRes.data) {
    throw new Error('Session not found');
  }
  const facilitatorId = sessionRes.data.facilitator_id as string;

  // 2. Stage lookup — needed for the default title, AND validates the stage
  //    belongs to the session (composite FK would also reject the INSERT, but
  //    this surfaces a clearer error and gives us stage_type for the branch).
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

  // 3. Idempotency check. For shared_model, the row is owned by the
  //    facilitator and shared by all participants — query without owner.
  //    For other stages, scope the lookup to the caller's own row.
  let existingQuery = supabase
    .from('models')
    .select('id')
    .eq('session_id', sessionId)
    .eq('stage_id', stageId)
    .is('deleted_at', null);
  if (stageType !== 'shared_model') {
    existingQuery = existingQuery.eq('owner_profile_id', user.id);
  }
  const existingRes = await existingQuery.maybeSingle();
  if (existingRes.error) {
    throw new Error(`Existing-model lookup failed: ${existingRes.error.message}`);
  }
  if (existingRes.data) {
    revalidatePath(`/app/sessions/${sessionId}`);
    redirect(`/app/designs/${existingRes.data.id}`);
  }

  // 4. Insert. For shared_model the insert is elevated to service-role so
  //    any session-org member can trigger it while the row is owned by the
  //    facilitator. For other stages the caller's own RLS-scoped client
  //    does an insert as themselves.
  const ownerForInsert = stageType === 'shared_model' ? facilitatorId : user.id;
  const insertClient = stageType === 'shared_model' ? getServiceSupabaseClient() : supabase;

  const insertRes = await insertClient
    .from('models')
    .insert({
      owner_profile_id: ownerForInsert,
      title: defaultModelTitle(stageType),
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
      session_id: sessionId,
      stage_id: stageId,
    })
    .select('id')
    .single();
  if (insertRes.error) {
    if (insertRes.error.code === '23505') {
      // Race-recovery: re-select with the same scoping rule used above.
      let winnerQuery = supabase
        .from('models')
        .select('id')
        .eq('session_id', sessionId)
        .eq('stage_id', stageId)
        .is('deleted_at', null);
      if (stageType !== 'shared_model') {
        winnerQuery = winnerQuery.eq('owner_profile_id', user.id);
      }
      const winnerRes = await winnerQuery.single();
      if (winnerRes.error || !winnerRes.data) {
        throw new Error(`Insert race-recovery failed: ${winnerRes.error?.message ?? 'no winner'}`);
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
 * Update per-session stage overrides (title and/or description). Either can
 * be set to null to fall back to the canonical default for the stage_type.
 *
 * RLS on `stages` UPDATE already restricts writes to facilitator + org admin,
 * so a non-authorised caller receives zero rows back; we surface that as an
 * explicit error rather than a silent no-op.
 */
export async function updateStageMeta(input: {
  stageId: string;
  title: string | null;
  description: string | null;
}): Promise<void> {
  if (!UUID_RE.test(input.stageId)) {
    throw new Error('Invalid stageId');
  }
  const title = input.title === null ? null : input.title.trim().slice(0, 200) || null;
  const description =
    input.description === null ? null : input.description.trim().slice(0, 500) || null;

  const { supabase } = await requireUser();

  const updateRes = await supabase
    .from('stages')
    .update({ title, description })
    .eq('id', input.stageId)
    .select('id, session_id')
    .maybeSingle();
  if (updateRes.error) {
    throw new Error(`Failed to update stage: ${updateRes.error.message}`);
  }
  if (!updateRes.data) {
    throw new Error('Stage not found, or you do not have permission to edit it.');
  }

  revalidatePath(`/app/sessions/${updateRes.data.session_id}`);
}

/**
 * Update session metadata (status, mode, scheduled_for). Same RLS as rename:
 * facilitator + org admin only.
 *
 * `scheduled_for` is allowed to be null (e.g. dropping a tentative schedule).
 * We do not gate status transitions in app code — the schema accepts any
 * enum value at any time, and the workflow rules will land if/when a real
 * state-machine emerges. For now this is a metadata-edit form, not a
 * lifecycle controller.
 */
export async function updateSessionMeta(input: {
  sessionId: string;
  status: SessionStatus;
  mode: SessionMode;
  scheduledFor: string | null;
}): Promise<void> {
  if (!UUID_RE.test(input.sessionId)) {
    throw new Error('Invalid sessionId');
  }
  if (!SESSION_STATUSES.includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`);
  }
  if (!SESSION_MODES.includes(input.mode)) {
    throw new Error(`Invalid mode: ${input.mode}`);
  }
  let scheduledForIso: string | null = null;
  if (input.scheduledFor !== null && input.scheduledFor !== '') {
    const parsed = new Date(input.scheduledFor);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid scheduledFor');
    }
    scheduledForIso = parsed.toISOString();
  }

  const { supabase } = await requireUser();
  const updateRes = await supabase
    .from('sessions')
    .update({
      status: input.status,
      mode: input.mode,
      scheduled_for: scheduledForIso,
    })
    .eq('id', input.sessionId)
    .select('id');
  if (updateRes.error) {
    throw new Error(`Failed to update session: ${updateRes.error.message}`);
  }
  if (!updateRes.data || updateRes.data.length === 0) {
    throw new Error('Session not found, or you do not have permission to edit it.');
  }

  revalidatePath(`/app/sessions/${input.sessionId}`);
  revalidatePath('/app/my-designs');
}

/**
 * Hard-delete a session. Cascades to stages → models → model_versions via
 * the existing FK chain. RLS on `sessions` grants DELETE to facilitator +
 * org admin under the combined "facilitator or admin can write" policy.
 *
 * Pre-fetches `session.org_id` so we know where to redirect after the row
 * is gone (RLS would also let us SELECT it, but the row is already deleted
 * by then, so we capture it first).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!UUID_RE.test(sessionId)) {
    throw new Error('Invalid sessionId');
  }
  const { supabase } = await requireUser();

  const sessionRes = await supabase
    .from('sessions')
    .select('org_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionRes.error) {
    throw new Error(`Session lookup failed: ${sessionRes.error.message}`);
  }
  if (!sessionRes.data) {
    throw new Error('Session not found, or you do not have permission to delete it.');
  }
  const orgId = sessionRes.data.org_id;

  const delRes = await supabase.from('sessions').delete().eq('id', sessionId).select('id');
  if (delRes.error) {
    throw new Error(`Failed to delete session: ${delRes.error.message}`);
  }
  if (!delRes.data || delRes.data.length === 0) {
    throw new Error('Session not found, or you do not have permission to delete it.');
  }

  revalidatePath(`/app/orgs/${orgId}`);
  revalidatePath('/app/my-designs');
  redirect(`/app/orgs/${orgId}`);
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
  const delRes = await supabase.from('models').delete().eq('id', modelId).select('id');
  if (delRes.error) {
    throw new Error(`Failed to delete model: ${delRes.error.message}`);
  }
  if (!delRes.data || delRes.data.length === 0) {
    throw new Error('Model not found or not authorised to delete');
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  redirect(`/app/sessions/${sessionId}`);
}
