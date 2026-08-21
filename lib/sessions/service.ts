import { type ActionResult, fail, ok } from '@/lib/actions/result';
import type { ServerSupabaseClient } from '@/lib/db/server';
import { isUuid } from '@/lib/db/uuid';
import { STAGE_DEFAULT_DURATIONS_SECONDS } from '@/lib/sessions/stage-labels';
import {
  CANONICAL_STAGE_TYPES,
  SESSION_MODES,
  SESSION_STATUSES,
  type SessionMode,
  type SessionStatus,
} from '@/lib/sessions/types';

export type CreateSessionFailure = 'invalid_title' | 'invalid_org' | 'not_member';
export type CreateSessionResult = ActionResult<{ sessionId: string }, CreateSessionFailure>;

/**
 * Create a session and its five canonical stages in one transaction.
 *
 * Callable from anywhere with an authenticated client — a server action, a
 * route handler, or an AI assistant tool. Unlike the `createSession` form
 * action that wraps it, this returns the new id instead of redirecting to it.
 *
 * Domain failures return a code. Infrastructure failures throw.
 */
export async function createSessionWithStages(input: {
  supabase: ServerSupabaseClient;
  userId: string;
  orgId: string;
  title: string;
}): Promise<CreateSessionResult> {
  const title = input.title.trim().slice(0, 200);
  if (title.length === 0) return fail('invalid_title');
  if (!isUuid(input.orgId)) return fail('invalid_org');

  // Defence-in-depth: RLS on `sessions` insert would already reject a
  // non-member, but checking here yields a clear code instead of a raw
  // Postgres policy violation.
  const memberRes = await input.supabase
    .from('org_memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('org_id', input.orgId)
    .eq('profile_id', input.userId);
  if (memberRes.error) {
    throw new Error(`Membership check failed: ${memberRes.error.message}`);
  }
  if ((memberRes.count ?? 0) === 0) return fail('not_member');

  const stageRows = CANONICAL_STAGE_TYPES.map((stage_type, position) => ({
    stage_type,
    position,
    duration_seconds: STAGE_DEFAULT_DURATIONS_SECONDS[stage_type],
  }));

  const createRes = await input.supabase.rpc('create_session_with_stages', {
    p_org_id: input.orgId,
    p_title: title,
    p_stages: stageRows,
  });
  if (createRes.error || !createRes.data) {
    throw new Error(`Failed to create session: ${createRes.error?.message ?? 'unknown'}`);
  }

  return ok({ sessionId: createRes.data as string });
}

export type RenameSessionFailure = 'invalid_session' | 'invalid_title' | 'not_found';

/**
 * Rename a session. RLS on `sessions` UPDATE grants facilitator + org admin
 * write access; an unauthorised caller updates zero rows, which surfaces as
 * `not_found` rather than a permission error (no existence leak).
 */
export async function renameSessionById(input: {
  supabase: ServerSupabaseClient;
  sessionId: string;
  title: string;
}): Promise<ActionResult<null, RenameSessionFailure>> {
  if (!isUuid(input.sessionId)) return fail('invalid_session');
  const trimmed = input.title.trim().slice(0, 200);
  if (trimmed.length === 0) return fail('invalid_title');

  const updateRes = await input.supabase
    .from('sessions')
    .update({ title: trimmed })
    .eq('id', input.sessionId)
    .select('id');
  if (updateRes.error) {
    throw new Error(`Failed to rename session: ${updateRes.error.message}`);
  }
  if (!updateRes.data || updateRes.data.length === 0) return fail('not_found');

  return ok(null);
}

export type UpdateStageMetaFailure = 'invalid_stage' | 'not_found';

/** Update a stage's display title/description. Returns the owning session id
 *  so the caller knows which path to revalidate. */
export async function updateStageMetaById(input: {
  supabase: ServerSupabaseClient;
  stageId: string;
  title: string | null;
  description: string | null;
}): Promise<ActionResult<{ sessionId: string }, UpdateStageMetaFailure>> {
  if (!isUuid(input.stageId)) return fail('invalid_stage');

  const title = input.title === null ? null : input.title.trim().slice(0, 200) || null;
  const description =
    input.description === null ? null : input.description.trim().slice(0, 500) || null;

  const updateRes = await input.supabase
    .from('stages')
    .update({ title, description })
    .eq('id', input.stageId)
    .select('id, session_id')
    .maybeSingle();
  if (updateRes.error) {
    throw new Error(`Failed to update stage: ${updateRes.error.message}`);
  }
  if (!updateRes.data) return fail('not_found');

  return ok({ sessionId: updateRes.data.session_id });
}

export type UpdateSessionMetaFailure =
  | 'invalid_session'
  | 'invalid_status'
  | 'invalid_mode'
  | 'invalid_scheduled_for'
  | 'not_found';

/** Update session status/mode/schedule. Status transitions are deliberately
 *  ungated — this is a metadata edit, not a lifecycle controller. */
export async function updateSessionMetaById(input: {
  supabase: ServerSupabaseClient;
  sessionId: string;
  status: SessionStatus;
  mode: SessionMode;
  scheduledFor: string | null;
}): Promise<ActionResult<null, UpdateSessionMetaFailure>> {
  if (!isUuid(input.sessionId)) return fail('invalid_session');
  if (!SESSION_STATUSES.includes(input.status)) return fail('invalid_status');
  if (!SESSION_MODES.includes(input.mode)) return fail('invalid_mode');

  let scheduledForIso: string | null = null;
  if (input.scheduledFor !== null && input.scheduledFor !== '') {
    const parsed = new Date(input.scheduledFor);
    if (Number.isNaN(parsed.getTime())) return fail('invalid_scheduled_for');
    scheduledForIso = parsed.toISOString();
  }

  const updateRes = await input.supabase
    .from('sessions')
    .update({ status: input.status, mode: input.mode, scheduled_for: scheduledForIso })
    .eq('id', input.sessionId)
    .select('id');
  if (updateRes.error) {
    throw new Error(`Failed to update session: ${updateRes.error.message}`);
  }
  if (!updateRes.data || updateRes.data.length === 0) return fail('not_found');

  return ok(null);
}
