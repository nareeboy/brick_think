import { getServiceSupabaseClient } from '@/lib/db/service';
import type { StageType } from '@/lib/sessions/types';

export type NarrationCleanupStatus = 'skipped' | 'succeeded' | 'failed';

export interface ModelNarration {
  modelId: string;
  profileId: string | null;
  stageType: StageType;
  transcript: string;
  transcriptRaw: string;
  cleaned: boolean;
  cleanupStatus: NarrationCleanupStatus;
  durationMs: number | null;
  updatedAt: string;
}

/**
 * The single read projection point for model narrations. Service-role read +
 * an explicit readability gate via can_read_model (service_role-only RPC), so
 * only callers who can read the parent model get the transcript. Returns null
 * for no narration OR no read access — callers cannot distinguish, by design.
 */
export async function getModelNarration(
  modelId: string,
  userId: string,
): Promise<ModelNarration | null> {
  const svc = getServiceSupabaseClient();

  const gate = await svc.rpc('can_read_model', {
    p_profile_id: userId,
    p_model_id: modelId,
  });
  if (gate.error) throw new Error(`can_read_model failed: ${gate.error.message}`);
  if (gate.data !== true) return null;

  const { data, error } = await svc
    .from('model_narrations')
    .select(
      'model_id, profile_id, stage_type, transcript, transcript_raw, cleaned, cleanup_status, duration_ms, updated_at',
    )
    .eq('model_id', modelId)
    .maybeSingle();
  if (error) throw new Error(`model_narrations read failed: ${error.message}`);
  if (!data) return null;

  return {
    modelId: data.model_id,
    profileId: data.profile_id,
    stageType: data.stage_type as StageType,
    transcript: data.transcript,
    transcriptRaw: data.transcript_raw,
    cleaned: data.cleaned,
    cleanupStatus: data.cleanup_status as NarrationCleanupStatus,
    durationMs: data.duration_ms,
    updatedAt: data.updated_at,
  };
}
