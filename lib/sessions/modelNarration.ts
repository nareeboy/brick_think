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

const NARRATION_COLUMNS =
  'model_id, profile_id, stage_type, transcript, transcript_raw, cleaned, cleanup_status, duration_ms, updated_at';

interface NarrationRow {
  model_id: string;
  profile_id: string | null;
  stage_type: string;
  transcript: string;
  transcript_raw: string;
  cleaned: boolean;
  cleanup_status: string;
  duration_ms: number | null;
  updated_at: string;
}

function mapNarrationRow(data: NarrationRow): ModelNarration {
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

/**
 * The single read projection point for a single model narration. Service-role
 * read + an explicit readability gate via can_read_model (service_role-only
 * RPC), so only callers who can read the parent model get the transcript.
 * Returns null for no narration OR no read access — callers cannot distinguish.
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
    .select(NARRATION_COLUMNS)
    .eq('model_id', modelId)
    .maybeSingle();
  if (error) throw new Error(`model_narrations read failed: ${error.message}`);
  if (!data) return null;

  return mapNarrationRow(data as NarrationRow);
}

/**
 * Batch read of narrations for a set of models, keyed by model id. Service-role
 * with NO per-model read gate — the CALLER must already be authorized to read
 * every model in `modelIds`. Intended for a session facilitator / org manager
 * (canManageSession) who can read all of a session's models; do not call it on
 * an unauthorized path.
 */
export async function getNarrationsForModelIds(
  modelIds: string[],
): Promise<Map<string, ModelNarration>> {
  if (modelIds.length === 0) return new Map();
  const svc = getServiceSupabaseClient();
  const { data, error } = await svc
    .from('model_narrations')
    .select(NARRATION_COLUMNS)
    .in('model_id', modelIds);
  if (error) throw new Error(`model_narrations batch read failed: ${error.message}`);
  return new Map(
    (data ?? []).map((row) => {
      const mapped = mapNarrationRow(row as NarrationRow);
      return [mapped.modelId, mapped];
    }),
  );
}
