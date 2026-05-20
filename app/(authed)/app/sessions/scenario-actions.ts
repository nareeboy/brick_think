'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import {
  ALLOWED_PRE_SESSION_KEYS,
  type PreSessionCheckKey,
} from '@/lib/sessions/preSessionCheck';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Types live alongside the actions but are erased at compile time, so they
// don't trip the Next.js "use server" rule (async-functions-only). The
// runtime ALLOWED_PRE_SESSION_KEYS constant lives in the non-server module
// imported above.

export type ScenarioActionFailure =
  | { ok: false; code: 'unauthenticated' }
  | { ok: false; code: 'invalid_uuid' }
  | { ok: false; code: 'stage_not_found' }
  | { ok: false; code: 'session_not_found' }
  | { ok: false; code: 'not_facilitator' }
  | { ok: false; code: 'scenario_not_found' }
  | { ok: false; code: 'scenario_stage_mismatch' }
  | { ok: false; code: 'brief_too_long' }
  | { ok: false; code: 'invalid_check_key' }
  | { ok: false; code: 'invalid_check_value' };

export type ScenarioActionResult = { ok: true } | ScenarioActionFailure;

const BRIEF_MAX_CHARS = 4000;

/**
 * Pick a template / org-scoped scenario for a stage, or clear the pick with
 * `scenarioId = null`. Facilitator-gated. No `stage_events` row — this is
 * config, not runtime; mirrors `updateStageMeta`.
 */
export async function setStageScenarioAction(
  stageId: string,
  scenarioId: string | null,
): Promise<ScenarioActionResult> {
  if (!UUID_RE.test(stageId)) return { ok: false, code: 'invalid_uuid' };
  if (scenarioId !== null && !UUID_RE.test(scenarioId)) {
    return { ok: false, code: 'invalid_uuid' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // RLS-scoped read; org outsiders see no row → stage_not_found.
  const stageRes = await supabase
    .from('stages')
    .select(
      'id, session_id, stage_type, sessions!stages_session_id_fkey ( id, facilitator_id )',
    )
    .eq('id', stageId)
    .maybeSingle();
  if (stageRes.error) {
    throw new Error(`Failed to load stage: ${stageRes.error.message}`);
  }
  if (!stageRes.data) return { ok: false, code: 'stage_not_found' };

  const stage = stageRes.data as unknown as {
    id: string;
    session_id: string;
    stage_type: string;
    sessions: { id: string; facilitator_id: string | null };
  };

  if (stage.sessions.facilitator_id !== user.id) {
    return { ok: false, code: 'not_facilitator' };
  }

  if (scenarioId !== null) {
    const scenarioRes = await supabase
      .from('scenarios')
      .select('id, stage_type')
      .eq('id', scenarioId)
      .maybeSingle();
    if (scenarioRes.error) {
      throw new Error(`Failed to load scenario: ${scenarioRes.error.message}`);
    }
    if (!scenarioRes.data) return { ok: false, code: 'scenario_not_found' };
    if (scenarioRes.data.stage_type !== stage.stage_type) {
      return { ok: false, code: 'scenario_stage_mismatch' };
    }
  }

  const svc = getServiceSupabaseClient();
  const upd = await svc.from('stages').update({ scenario_id: scenarioId }).eq('id', stage.id);
  if (upd.error) throw new Error(`setStageScenario update failed: ${upd.error.message}`);

  revalidatePath(`/app/sessions/${stage.session_id}`);
  return { ok: true };
}

/**
 * Set the facilitator's pre-session brief. Pass `null` (or whitespace-only)
 * to clear. Facilitator-gated. Trimmed; max 4000 chars (matches the DB
 * CHECK constraint).
 */
export async function updateSessionBriefAction(
  sessionId: string,
  briefText: string | null,
): Promise<ScenarioActionResult> {
  if (!UUID_RE.test(sessionId)) return { ok: false, code: 'invalid_uuid' };

  let normalised: string | null = null;
  if (briefText !== null) {
    const trimmed = briefText.trim();
    if (trimmed.length > BRIEF_MAX_CHARS) return { ok: false, code: 'brief_too_long' };
    normalised = trimmed === '' ? null : trimmed;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const sessRes = await supabase
    .from('sessions')
    .select('id, facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessRes.error) throw new Error(`Failed to load session: ${sessRes.error.message}`);
  if (!sessRes.data) return { ok: false, code: 'session_not_found' };
  if (sessRes.data.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };

  const svc = getServiceSupabaseClient();
  const upd = await svc.from('sessions').update({ brief_text: normalised }).eq('id', sessionId);
  if (upd.error) throw new Error(`updateSessionBrief update failed: ${upd.error.message}`);

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}

/**
 * Shallow-merge a single whitelisted key into sessions.pre_session_check.
 * Facilitator-gated. Phase-1 whitelist: 'a11y_reviewed'.
 *
 * Pre-existing keys outside the whitelist (e.g. a future Phase-2 key seeded
 * by a different migration) are preserved by the merge — only the supplied
 * key is overwritten.
 */
export async function updatePreSessionCheckAction(
  sessionId: string,
  key: PreSessionCheckKey,
  value: boolean,
): Promise<ScenarioActionResult> {
  if (!UUID_RE.test(sessionId)) return { ok: false, code: 'invalid_uuid' };
  if (!ALLOWED_PRE_SESSION_KEYS.includes(key)) {
    return { ok: false, code: 'invalid_check_key' };
  }
  if (typeof value !== 'boolean') {
    return { ok: false, code: 'invalid_check_value' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const sessRes = await supabase
    .from('sessions')
    .select('id, facilitator_id, pre_session_check')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessRes.error) throw new Error(`Failed to load session: ${sessRes.error.message}`);
  if (!sessRes.data) return { ok: false, code: 'session_not_found' };
  if (sessRes.data.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };

  const previous =
    sessRes.data.pre_session_check && typeof sessRes.data.pre_session_check === 'object'
      ? (sessRes.data.pre_session_check as Record<string, unknown>)
      : {};
  const merged = { ...previous, [key]: value };

  const svc = getServiceSupabaseClient();
  const upd = await svc
    .from('sessions')
    .update({ pre_session_check: merged })
    .eq('id', sessionId);
  if (upd.error) throw new Error(`updatePreSessionCheck update failed: ${upd.error.message}`);

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true };
}
