import { type ActionResult, fail, ok } from '@/lib/actions/result';
import type { ServerSupabaseClient } from '@/lib/db/server';
import { isUuid } from '@/lib/db/uuid';
import { STAGE_DEFAULT_DURATIONS_SECONDS } from '@/lib/sessions/stage-labels';
import { CANONICAL_STAGE_TYPES } from '@/lib/sessions/types';

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
