'use server';

// Custom scenario authoring actions. All writes go through the USER-scoped
// Supabase client so the RLS policies from 20260804090000_scenarios_authoring
// are the enforcer: org members insert non-template rows into their own org;
// only the creator updates/deletes. No service-role client here on purpose.

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/lib/actions/result';
import { createServerSupabaseClient } from '@/lib/db/server';
import { validateScenarioDraft, type ScenarioDraftInput } from '@/lib/scenarios/authoring';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScenarioActionResult = ActionResult<
  { id: string },
  'unauthenticated' | 'invalid_input' | 'not_org_member' | 'not_found_or_not_creator'
>;

export async function createScenarioAction(
  input: ScenarioDraftInput,
): Promise<ScenarioActionResult> {
  const validated = validateScenarioDraft(input);
  if (!validated.ok) return { ok: false, code: 'invalid_input' };
  const { draft } = validated;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const res = await supabase
    .from('scenarios')
    .insert({
      stage_type: draft.stageType,
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      duration_minutes: draft.durationMinutes,
      is_template: false,
      org_id: draft.orgId,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (res.error) {
    // 42501 = RLS refusal — the caller isn't a member of that org (or tried
    // to forge template/authorship fields, which the action never sends).
    if (res.error.code === '42501') return { ok: false, code: 'not_org_member' };
    throw new Error(`Failed to create scenario: ${res.error.message}`);
  }

  revalidatePath('/app/scenarios');
  return { ok: true, data: { id: res.data.id } };
}

export async function updateScenarioAction(
  id: string,
  input: ScenarioDraftInput,
): Promise<ScenarioActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, code: 'invalid_input' };
  const validated = validateScenarioDraft(input);
  if (!validated.ok) return { ok: false, code: 'invalid_input' };
  const { draft } = validated;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // RLS scopes the UPDATE to the caller's own non-template rows; zero rows
  // back means "doesn't exist, not visible, or not yours" — one code covers
  // all three so the response doesn't leak row existence.
  const res = await supabase
    .from('scenarios')
    .update({
      stage_type: draft.stageType,
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      duration_minutes: draft.durationMinutes,
      org_id: draft.orgId,
    })
    .eq('id', id)
    .select('id');

  if (res.error) {
    if (res.error.code === '42501') return { ok: false, code: 'not_org_member' };
    throw new Error(`Failed to update scenario: ${res.error.message}`);
  }
  if (!res.data || res.data.length === 0) {
    return { ok: false, code: 'not_found_or_not_creator' };
  }

  revalidatePath('/app/scenarios');
  return { ok: true, data: { id } };
}

export async function deleteScenarioAction(id: string): Promise<ScenarioActionResult> {
  if (!UUID_RE.test(id)) return { ok: false, code: 'invalid_input' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const res = await supabase.from('scenarios').delete().eq('id', id).select('id');

  if (res.error) {
    throw new Error(`Failed to delete scenario: ${res.error.message}`);
  }
  if (!res.data || res.data.length === 0) {
    return { ok: false, code: 'not_found_or_not_creator' };
  }

  revalidatePath('/app/scenarios');
  return { ok: true, data: { id } };
}
