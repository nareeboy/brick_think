'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { getAnthropicClientForProfile } from '@/lib/integrations/anthropic';
import { cleanupTranscript } from '@/lib/sessions/narrationCleanup';
import type { NarrationCleanupStatus } from '@/lib/sessions/modelNarration';

// ~4000 words (~20 min of speech). Haiku's max_tokens (2048) comfortably
// covers cleaning a transcript of this size; longer input is truncated.
const TRANSCRIPT_MAX = 20000;

export type SaveNarrationResult =
  | {
      ok: true;
      transcript: string;
      cleaned: boolean;
      cleanupStatus: NarrationCleanupStatus;
    }
  | { ok: false; code: 'unauthenticated' | 'not_owner' | 'empty_transcript' | 'model_not_found' };

export async function saveNarration(
  modelId: string,
  transcriptRaw: string,
  durationMs: number | null,
): Promise<SaveNarrationResult> {
  const trimmed = transcriptRaw.trim().slice(0, TRANSCRIPT_MAX);
  if (!trimmed) return { ok: false, code: 'empty_transcript' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const svc = getServiceSupabaseClient();
  const modelRes = await svc
    .from('models')
    .select('id, owner_profile_id, stage_id')
    .eq('id', modelId)
    .is('deleted_at', null)
    .maybeSingle();
  if (modelRes.error) throw new Error(`model lookup failed: ${modelRes.error.message}`);
  if (!modelRes.data) return { ok: false, code: 'model_not_found' };
  if (modelRes.data.owner_profile_id !== user.id) return { ok: false, code: 'not_owner' };

  const stageRes = await svc
    .from('stages')
    .select('stage_type')
    .eq('id', modelRes.data.stage_id)
    .maybeSingle();
  if (stageRes.error) throw new Error(`stage lookup failed: ${stageRes.error.message}`);
  const stageType = stageRes.data?.stage_type;
  if (!stageType) return { ok: false, code: 'model_not_found' };

  // Optional Claude tidy-up — best-effort. Any failure degrades to raw.
  let transcript = trimmed;
  let cleaned = false;
  let cleanupStatus: NarrationCleanupStatus = 'skipped';

  const anthropic = await getAnthropicClientForProfile(user.id);
  if (anthropic.ok) {
    const result = await cleanupTranscript(anthropic.client, trimmed);
    if (result.ok) {
      transcript = result.text;
      cleaned = true;
      cleanupStatus = 'succeeded';
    } else {
      cleanupStatus = 'failed';
    }
  }

  const upsert = await svc.from('model_narrations').upsert(
    {
      model_id: modelId,
      profile_id: user.id,
      stage_type: stageType,
      transcript_raw: trimmed,
      transcript,
      cleaned,
      cleanup_status: cleanupStatus,
      duration_ms: durationMs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'model_id' },
  );
  if (upsert.error) throw new Error(`model_narrations upsert failed: ${upsert.error.message}`);

  revalidatePath(`/app/designs/${modelId}`);
  return { ok: true, transcript, cleaned, cleanupStatus };
}
