import { type ActionResult, fail, ok } from '@/lib/actions/result';
import type { ServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { isValidSlug } from '@/lib/orgs/slug';
import { STAGE_DEFAULT_DURATIONS_SECONDS } from '@/lib/sessions/stage-labels';
import { CANONICAL_STAGE_TYPES } from '@/lib/sessions/types';

export type CreateWorkshopFailure = 'slug_taken';
export type CreateWorkshopResult =
  | ActionResult<{ orgId: string }, CreateWorkshopFailure>
  | { ok: false; code: 'invalid_input'; field: 'name' | 'slug' };

/**
 * Create a workshop (organisation) owned by `ownerId`.
 *
 * Service-role insert: the application-level invariant (owner_id = the
 * authenticated caller) is enforced by the caller passing its own id. The
 * user-scoped client hits an RLS check that fails inconsistently on freshly
 * created profiles in some Supabase setups, even when owner_id matches
 * auth.uid(). The owner-membership trigger on organisations runs either way.
 *
 * Callers MUST pass their own authenticated id as `ownerId` — this function
 * performs no authentication and no check that `ownerId` belongs to the
 * caller; it trusts the caller the way `createOrgAction` does (`ownerId`
 * comes straight from `requireUser()`), because the service-role client
 * bypasses RLS entirely. Contrast with `createWorkshopWithSession` below,
 * whose RPC has a Postgres-side `auth.uid()` guard on the equivalent
 * argument — same shape (an id parameter plus a service/definer write), the
 * opposite safety property. Do not reach for this one with an id that isn't
 * already known to be the caller's.
 */
export async function createWorkshop(input: {
  name: string;
  slug: string;
  ownerId: string;
}): Promise<CreateWorkshopResult> {
  const name = input.name.trim();
  const slug = input.slug.trim();

  if (name.length < 1 || name.length > 80) {
    return { ok: false, code: 'invalid_input', field: 'name' };
  }
  if (!isValidSlug(slug)) {
    return { ok: false, code: 'invalid_input', field: 'slug' };
  }

  const service = getServiceSupabaseClient();
  const { data, error } = await service
    .from('organisations')
    .insert({ name, slug, owner_id: input.ownerId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return fail('slug_taken');
    throw new Error(`Failed to create workshop: ${error.message}`);
  }
  if (!data) throw new Error('Failed to create workshop: no id returned');

  return ok({ orgId: data.id });
}

export type RenameWorkshopFailure = 'invalid_input' | 'forbidden' | 'not_found';

/**
 * Rename a workshop.
 *
 * RLS restricts UPDATE to admins/owners. A row only comes back from
 * `.select()` if the policy passed AND the row existed, so zero rows is
 * ambiguous — a follow-up existence probe separates "you may not" from
 * "there is no such workshop" and lets the UI show the right message.
 */
export async function renameWorkshop(input: {
  supabase: ServerSupabaseClient;
  orgId: string;
  name: string;
}): Promise<ActionResult<null, RenameWorkshopFailure>> {
  const trimmed = input.name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) return fail('invalid_input');

  const { data, error } = await input.supabase
    .from('organisations')
    .update({ name: trimmed })
    .eq('id', input.orgId)
    .select('id');
  if (error) {
    if (error.code === '42501') return fail('forbidden');
    throw new Error(`Rename failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    const { count } = await input.supabase
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('id', input.orgId);
    return (count ?? 0) === 0 ? fail('not_found') : fail('forbidden');
  }

  return ok(null);
}

export type CreateWorkshopWithSessionFailure = 'invalid_input' | 'slug_taken';

/**
 * Create a workshop and its first session atomically. Used by the AI setup
 * assistant's opening move, where three separate writes could otherwise
 * strand a half-built workshop the facilitator has to clean up by hand.
 *
 * Unlike `createWorkshop` above, `userId` here does not have to be trusted
 * by convention: the `create_workshop_with_session` RPC is SECURITY DEFINER
 * with an explicit `auth.uid()` guard that rejects any `p_owner_id` that
 * isn't the authenticated caller, so an unauthorised `userId` fails inside
 * the database rather than relying on the caller to have checked first.
 */
export async function createWorkshopWithSession(input: {
  supabase: ServerSupabaseClient;
  userId: string;
  workshopName: string;
  slug: string;
  sessionTitle: string;
}): Promise<ActionResult<{ orgId: string; sessionId: string }, CreateWorkshopWithSessionFailure>> {
  const name = input.workshopName.trim();
  const slug = input.slug.trim();
  const sessionTitle = input.sessionTitle.trim().slice(0, 200);

  if (name.length < 1 || name.length > 80) return fail('invalid_input');
  if (!isValidSlug(slug)) return fail('invalid_input');
  if (sessionTitle.length === 0) return fail('invalid_input');

  const stageRows = CANONICAL_STAGE_TYPES.map((stage_type, position) => ({
    stage_type,
    position,
    duration_seconds: STAGE_DEFAULT_DURATIONS_SECONDS[stage_type],
  }));

  const res = await input.supabase.rpc('create_workshop_with_session', {
    p_name: name,
    p_slug: slug,
    p_owner_id: input.userId,
    p_session_title: sessionTitle,
    p_stages: stageRows,
  });
  if (res.error) {
    if (res.error.code === '23505') return fail('slug_taken');
    throw new Error(`Failed to create workshop with session: ${res.error.message}`);
  }

  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!row) throw new Error('Failed to create workshop with session: no row returned');

  return ok({ orgId: row.org_id, sessionId: row.session_id });
}
