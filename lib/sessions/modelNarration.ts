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
 * A model's narration as one combined transcript. Individual canvases have a
 * single speaker (the owner); room canvases combine every member's narration,
 * attributed by name. Derived at read time from the per-(model, speaker) rows.
 */
export interface CombinedNarration {
  combinedText: string;
  speakerCount: number;
  anyCleaned: boolean;
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
 * Combine a model's per-speaker narrations into one transcript. A single
 * speaker is shown verbatim; multiple speakers are attributed by name and
 * separated by blank lines. Returns null when there are no entries.
 */
export function combineNarrations(
  entries: Array<{ speakerName: string; transcript: string; cleaned: boolean }>,
): CombinedNarration | null {
  if (entries.length === 0) return null;
  const anyCleaned = entries.some((e) => e.cleaned);
  const [first] = entries;
  if (entries.length === 1 && first) {
    return { combinedText: first.transcript, speakerCount: 1, anyCleaned };
  }
  const combinedText = entries.map((e) => `${e.speakerName}:\n${e.transcript}`).join('\n\n');
  return { combinedText, speakerCount: entries.length, anyCleaned };
}

/**
 * The signed-in caller's OWN narration on a model (one per (model, speaker)).
 * Service-role read gated by can_read_model. Seeds the recorder's drawer so each
 * person records/replaces only their own piece. Null for none / no read access.
 */
export async function getMyNarration(
  modelId: string,
  userId: string,
): Promise<ModelNarration | null> {
  const svc = getServiceSupabaseClient();

  const gate = await svc.rpc('can_read_model', { p_profile_id: userId, p_model_id: modelId });
  if (gate.error) throw new Error(`can_read_model failed: ${gate.error.message}`);
  if (gate.data !== true) return null;

  const { data, error } = await svc
    .from('model_narrations')
    .select(NARRATION_COLUMNS)
    .eq('model_id', modelId)
    .eq('profile_id', userId)
    .maybeSingle();
  if (error) throw new Error(`model_narrations read failed: ${error.message}`);
  if (!data) return null;

  return mapNarrationRow(data as NarrationRow);
}

interface CombinedRow {
  model_id: string;
  transcript: string;
  cleaned: boolean;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
}

/**
 * Batch read of COMBINED narrations for a set of models, keyed by model id.
 * Service-role with NO per-model read gate — the CALLER must already be
 * authorized to read every model in `modelIds` (e.g. a canManageSession
 * facilitator who can read all of a session's models). One transcript per model,
 * combining every speaker's narration (attributed when there are several).
 */
export async function getCombinedNarrationsForModelIds(
  modelIds: string[],
): Promise<Map<string, CombinedNarration>> {
  if (modelIds.length === 0) return new Map();
  const svc = getServiceSupabaseClient();
  const { data, error } = await svc
    .from('model_narrations')
    .select(
      'model_id, transcript, cleaned, created_at, profile:profiles!model_narrations_profile_id_fkey ( full_name, email )',
    )
    .in('model_id', modelIds)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`model_narrations combined read failed: ${error.message}`);

  const byModel = new Map<
    string,
    Array<{ speakerName: string; transcript: string; cleaned: boolean }>
  >();
  for (const raw of (data ?? []) as unknown as CombinedRow[]) {
    const speakerName = raw.profile?.full_name?.trim() || raw.profile?.email || 'Participant';
    const list = byModel.get(raw.model_id) ?? [];
    list.push({ speakerName, transcript: raw.transcript, cleaned: raw.cleaned });
    byModel.set(raw.model_id, list);
  }

  const out = new Map<string, CombinedNarration>();
  for (const [modelId, entries] of byModel) {
    const combined = combineNarrations(entries);
    if (combined) out.set(modelId, combined);
  }
  return out;
}
