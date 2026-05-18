'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';
import { isValidTag, normaliseTag } from '@/lib/my-designs/types';
import type { CanvasState } from '@/lib/models/types';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');
  return { supabase, user };
}

// Guard for actions that mutate a single model: confirms the caller owns it
// before any destructive write. RLS would also reject, but a typed error in
// front of the delete/insert is friendlier for the UI and avoids the half-
// applied state if the write-side check were the only line of defence.
type SupabaseFromRequireUser = Awaited<ReturnType<typeof requireUser>>['supabase'];
async function assertOwnsModel(
  supabase: SupabaseFromRequireUser,
  modelId: string,
  userId: string,
): Promise<void> {
  const res = await supabase
    .from('models')
    .select('id', { count: 'exact', head: true })
    .eq('id', modelId)
    .eq('owner_profile_id', userId);
  if (res.error) throw new Error(`Ownership lookup failed: ${res.error.message}`);
  if ((res.count ?? 0) === 0) throw new Error('Design not found or not owned by you');
}

export interface CreateDesignInput {
  orgId: string | null;
  sessionId: string | null;
}

export async function createDesignAction(input: CreateDesignInput): Promise<string> {
  const { orgId, sessionId } = input;
  if (orgId !== null && !UUID_RE.test(orgId)) {
    throw new Error('Invalid orgId');
  }
  if (sessionId !== null && !UUID_RE.test(sessionId)) {
    throw new Error('Invalid sessionId');
  }
  if ((orgId === null) !== (sessionId === null)) {
    throw new Error('Personal designs require both orgId and sessionId to be null');
  }

  const { supabase, user } = await requireUser();

  let stageId: string | null = null;
  if (orgId !== null && sessionId !== null) {
    const { count, error: memberError } = await supabase
      .from('org_memberships')
      .select('profile_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('profile_id', user.id);
    if (memberError) {
      throw new Error(`Membership check failed: ${memberError.message}`);
    }
    if ((count ?? 0) === 0) {
      throw new Error('You are not a member of that organisation');
    }

    const stageRes = await supabase
      .from('stages')
      .select('id, session_id, sessions:session_id (org_id)')
      .eq('session_id', sessionId)
      .eq('position', 0)
      .maybeSingle();
    if (stageRes.error || !stageRes.data) {
      throw new Error('Session not found or has no stages');
    }
    const sessionOrg = (stageRes.data as { sessions: { org_id: string } }).sessions?.org_id;
    if (sessionOrg !== orgId) {
      throw new Error('Session does not belong to the supplied organisation');
    }
    stageId = stageRes.data.id;
  }

  const { data, error } = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: 'Untitled model',
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
      org_id: null,
      session_id: sessionId,
      stage_id: stageId,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to create design: ${error?.message}`);
  }

  revalidatePath('/app/my-designs');
  if (sessionId) revalidatePath(`/app/sessions/${sessionId}`);
  return data.id;
}

export interface DuplicateInput {
  sourceModelId: string;
  orgId: string;
  sessionId: string;
}

export async function duplicateToSessionAction(input: DuplicateInput): Promise<string> {
  const { sourceModelId, orgId, sessionId } = input;
  for (const v of [sourceModelId, orgId, sessionId]) {
    if (!UUID_RE.test(v)) throw new Error('Invalid id');
  }

  const { supabase, user } = await requireUser();

  // 1. Membership pre-check (RLS would also reject, but typed error is nicer).
  const { count, error: memberError } = await supabase
    .from('org_memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('profile_id', user.id);
  if (memberError) {
    throw new Error(`Membership check failed: ${memberError.message}`);
  }
  if ((count ?? 0) === 0) throw new Error('You are not a member of that organisation');

  // 2. Load source — must be owned by caller and not deleted.
  const sourceRes = await supabase
    .from('models')
    .select('id, title, canvas_state, thumbnail_path, owner_profile_id')
    .eq('id', sourceModelId)
    .is('deleted_at', null)
    .single();
  if (sourceRes.error || !sourceRes.data) {
    throw new Error('Source design not found or not owned by you');
  }
  if (sourceRes.data.owner_profile_id !== user.id) {
    throw new Error('You can only send designs you own');
  }

  // 3. Resolve target session's first stage.
  const stageRes = await supabase
    .from('stages')
    .select('id, sessions:session_id ( org_id )')
    .eq('session_id', sessionId)
    .eq('position', 0)
    .maybeSingle();
  if (stageRes.error || !stageRes.data) throw new Error('Session not found or has no stages');
  const sessionOrg = (stageRes.data as { sessions: { org_id: string } }).sessions?.org_id;
  if (sessionOrg !== orgId) throw new Error('Session does not belong to the supplied organisation');

  // 4. Insert the new row. canvas_state is copied verbatim. Thumbnail is not
  //    copied — the next autosave will regenerate it.
  const insertRes = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: sourceRes.data.title,
      canvas_state: sourceRes.data.canvas_state,
      org_id: null,
      session_id: sessionId,
      stage_id: stageRes.data.id,
    })
    .select('id')
    .single();
  if (insertRes.error || !insertRes.data) {
    throw new Error(`Failed to duplicate: ${insertRes.error?.message}`);
  }

  revalidatePath('/app/my-designs');
  revalidatePath(`/app/sessions/${sessionId}`);
  return insertRes.data.id;
}

const MAX_TAGS_PER_MODEL = 12;

export async function renameTagAction(from: string, to: string): Promise<string> {
  const fromNorm = normaliseTag(String(from ?? ''));
  const toNorm = normaliseTag(String(to ?? ''));
  if (!isValidTag(fromNorm)) throw new Error('Invalid source tag');
  if (!isValidTag(toNorm)) throw new Error('Invalid target tag');
  if (fromNorm === toNorm) return toNorm;

  const { supabase, user } = await requireUser();

  // Owned model_ids that currently carry the source tag. We need them up front
  // because the rename is two writes (insert target, delete source) and we want
  // them to land as a coherent pair — RLS keeps it scoped to the caller, but
  // staging the IDs in JS lets us recover gracefully if the second write fails.
  const owned = await supabase
    .from('model_tags')
    .select('model_id, models!inner(owner_profile_id)')
    .eq('tag', fromNorm)
    .eq('models.owner_profile_id', user.id);
  if (owned.error) throw new Error(`Rename lookup failed: ${owned.error.message}`);
  const modelIds = (owned.data ?? []).map((r) => (r as { model_id: string }).model_id);
  if (modelIds.length === 0) return toNorm;

  // Insert target tag on every affected model, ignoring rows where the target
  // already exists (the model already had both `from` and `to`). Then delete
  // the source tag in a second pass. ON CONFLICT DO NOTHING via upsert.
  const upsertRows = modelIds.map((id) => ({ model_id: id, tag: toNorm }));
  const ins = await supabase
    .from('model_tags')
    .upsert(upsertRows, { onConflict: 'model_id,tag', ignoreDuplicates: true });
  if (ins.error) throw new Error(`Rename insert failed: ${ins.error.message}`);

  const del = await supabase
    .from('model_tags')
    .delete()
    .eq('tag', fromNorm)
    .in('model_id', modelIds);
  if (del.error) throw new Error(`Rename delete failed: ${del.error.message}`);

  revalidatePath('/app/my-designs');
  return toNorm;
}

export async function setModelTagsAction(modelId: string, rawTags: string[]): Promise<string[]> {
  if (!UUID_RE.test(modelId)) throw new Error('Invalid modelId');
  if (!Array.isArray(rawTags)) throw new Error('Invalid tags');

  const cleaned = Array.from(
    new Set(rawTags.map((t) => normaliseTag(String(t ?? ''))).filter((t) => isValidTag(t))),
  ).slice(0, MAX_TAGS_PER_MODEL);

  const { supabase, user } = await requireUser();
  await assertOwnsModel(supabase, modelId, user.id);

  // Wholesale replace: simplest correct semantics for an MVP editor.
  const del = await supabase.from('model_tags').delete().eq('model_id', modelId);
  if (del.error) throw new Error(`Failed to clear tags: ${del.error.message}`);

  if (cleaned.length > 0) {
    const rows = cleaned.map((tag) => ({ model_id: modelId, tag }));
    const ins = await supabase.from('model_tags').insert(rows);
    if (ins.error) throw new Error(`Failed to write tags: ${ins.error.message}`);
  }

  revalidatePath('/app/my-designs');
  return cleaned;
}

export interface ModelExportPayload {
  title: string;
  canvasState: CanvasState;
}

export async function getModelExportPayload(modelId: string): Promise<ModelExportPayload> {
  if (!UUID_RE.test(modelId)) throw new Error('Invalid modelId');
  const { supabase } = await requireUser();
  // RLS scopes the row — owner, session members, or org members can read.
  // ExportMenu only renders on cards the current user already sees, so this
  // matches the surface the user is acting on.
  const { data, error } = await supabase
    .from('models')
    .select('title, canvas_state')
    .eq('id', modelId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load design: ${error.message}`);
  if (!data) throw new Error('Design not found');
  return {
    title: data.title,
    canvasState: parseCanvasState(data.canvas_state),
  };
}
