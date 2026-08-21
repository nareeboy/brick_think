import { type ActionResult, fail, ok } from '@/lib/actions/result';
import type { ServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { isValidSlug } from '@/lib/orgs/slug';

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
