'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';
import type { CanvasState } from '@/lib/models/types';
import { IMPORT_RULES, isImportTarget, remapCanvasForImport } from '@/lib/sessions/stage-import';
import type { StageType } from '@/lib/sessions/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BringInResult =
  | { ok: true; mode: 'server_copied' }
  | { ok: true; mode: 'client_append'; source: CanvasState }
  | {
      ok: false;
      code:
        | 'unauthenticated'
        | 'invalid_uuid'
        | 'model_not_found'
        | 'unsupported_target_stage'
        | 'source_not_found'
        | 'already_imported'
        | 'destination_not_empty';
    };

export async function bringInPreviousModel(targetModelId: string): Promise<BringInResult> {
  if (!UUID_RE.test(targetModelId)) {
    return { ok: false, code: 'invalid_uuid' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // RLS read of the target. Non-org-members see no row → model_not_found.
  // models.stage_id is a composite FK (stage_id, session_id) → stages so we
  // can't use PostgREST embedded selects; resolve the stage row separately.
  const targetRes = await supabase
    .from('models')
    .select('id, session_id, stage_id, canvas_state')
    .eq('id', targetModelId)
    .is('deleted_at', null)
    .maybeSingle();
  if (targetRes.error) {
    throw new Error(`bringInPreviousModel: target lookup failed: ${targetRes.error.message}`);
  }
  if (!targetRes.data) return { ok: false, code: 'model_not_found' };

  const target = targetRes.data as {
    id: string;
    session_id: string | null;
    stage_id: string | null;
    canvas_state: unknown;
  };
  if (!target.session_id || !target.stage_id) {
    return { ok: false, code: 'unsupported_target_stage' };
  }

  // Resolve the target stage to get its stage_type.
  const targetStageRes = await supabase
    .from('stages')
    .select('id, stage_type')
    .eq('id', target.stage_id)
    .maybeSingle();
  if (targetStageRes.error || !targetStageRes.data) {
    return { ok: false, code: 'unsupported_target_stage' };
  }
  const stageType = targetStageRes.data.stage_type as StageType;
  if (!isImportTarget(stageType)) {
    return { ok: false, code: 'unsupported_target_stage' };
  }
  const rule = IMPORT_RULES[stageType];

  // Resolve the source stage_id within the same session.
  const sourceStageRes = await supabase
    .from('stages')
    .select('id')
    .eq('session_id', target.session_id)
    .eq('stage_type', rule.sourceStageType)
    .maybeSingle();
  if (sourceStageRes.error || !sourceStageRes.data) {
    return { ok: false, code: 'source_not_found' };
  }
  const sourceStageId = sourceStageRes.data.id as string;

  // Resolve the source model row.
  let sourceQuery = supabase
    .from('models')
    .select('id, canvas_state, owner_profile_id')
    .eq('session_id', target.session_id)
    .eq('stage_id', sourceStageId)
    .is('deleted_at', null);
  if (rule.sourceMode === 'caller_own') {
    sourceQuery = sourceQuery.eq('owner_profile_id', user.id);
  }
  const sourceRes = await sourceQuery.maybeSingle();
  if (sourceRes.error || !sourceRes.data) {
    return { ok: false, code: 'source_not_found' };
  }
  const sourceCanvas = parseCanvasState(sourceRes.data.canvas_state);
  if (sourceCanvas.bricks.length === 0) {
    return { ok: false, code: 'source_not_found' };
  }
  const sourceModelId = sourceRes.data.id as string;

  const svc = getServiceSupabaseClient();

  if (stageType === 'system_model') {
    // Re-read target canvas under service-role; assert emptiness.
    const recheck = await svc
      .from('models')
      .select('canvas_state')
      .eq('id', targetModelId)
      .single();
    if (recheck.error || !recheck.data) {
      throw new Error(`bringInPreviousModel: target recheck failed: ${recheck.error?.message}`);
    }
    const currentCanvas = parseCanvasState(recheck.data.canvas_state);
    if (currentCanvas.bricks.length > 0) {
      return { ok: false, code: 'destination_not_empty' };
    }
    const remapped = remapCanvasForImport(sourceCanvas, {});
    const upd = await svc
      .from('models')
      .update({ canvas_state: remapped as unknown as Json })
      .eq('id', targetModelId);
    if (upd.error) {
      throw new Error(`bringInPreviousModel: target update failed: ${upd.error.message}`);
    }
    const ins = await svc.from('model_imports').insert({
      target_model_id: targetModelId,
      source_model_id: sourceModelId,
      profile_id: user.id,
    });
    if (ins.error && ins.error.code !== '23505') {
      throw new Error(`bringInPreviousModel: audit insert failed: ${ins.error.message}`);
    }
    revalidatePath(`/app/sessions/${target.session_id}`);
    revalidatePath('/app/designs/[id]', 'page');
    return { ok: true, mode: 'server_copied' };
  }

  // shared_model branch: write the audit row first as the gate.
  const ins = await svc.from('model_imports').insert({
    target_model_id: targetModelId,
    source_model_id: sourceModelId,
    profile_id: user.id,
  });
  if (ins.error) {
    if (ins.error.code === '23505') {
      return { ok: false, code: 'already_imported' };
    }
    throw new Error(`bringInPreviousModel: audit insert failed: ${ins.error.message}`);
  }

  // Display-name lookup for the per-user root-group rename.
  const profileRes = await svc
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .maybeSingle();
  const displayName =
    profileRes.data?.full_name?.trim() || profileRes.data?.email?.split('@')[0] || 'Guest';

  const remapped = remapCanvasForImport(sourceCanvas, { renameRootGroupTo: displayName });
  return { ok: true, mode: 'client_append', source: remapped };
}
