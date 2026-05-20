'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { getAnthropicClientForProfile } from '@/lib/integrations/anthropic';
import { getCanvasImageBuffer } from '@/lib/reports/canvas-image';
import { collectSession, orderedStages } from '@/lib/reports/collect';
import { renderSessionReportPdf, type SessionReportData } from '@/lib/reports/pdf';
import { synthesizeReport } from '@/lib/reports/synthesize';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_BUCKET = 'session-reports';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type GenerateReportResult =
  | { ok: true; pdfUrl: string; generatedAt: string }
  | {
      ok: false;
      code:
        | 'invalid_uuid'
        | 'unauthenticated'
        | 'not_facilitator'
        | 'session_not_completed'
        | 'no_claude_key'
        | 'no_models'
        | 'claude_api_error'
        | 'render_failed'
        | 'storage_upload_failed';
      message?: string;
    };

export async function generateSessionReport(
  sessionId: string,
): Promise<GenerateReportResult> {
  if (!UUID_RE.test(sessionId)) return { ok: false, code: 'invalid_uuid' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('id, status, facilitator_id, org_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) return { ok: false, code: 'not_facilitator' };
  if (session.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };
  if (session.status !== 'completed') return { ok: false, code: 'session_not_completed' };

  const svc = getServiceSupabaseClient();

  const collected = await collectSession(svc, sessionId);
  if (!collected) return { ok: false, code: 'not_facilitator' };
  const stagesPresent = orderedStages(collected.modelsByStage);
  if (stagesPresent.length === 0) return { ok: false, code: 'no_models' };

  // The Anthropic key follows the facilitator, not the org. Each user pastes
  // their own key on /app/account; the report bills against that user's
  // Anthropic account.
  const clientLookup = await getAnthropicClientForProfile(user.id);
  if (!clientLookup.ok) return { ok: false, code: 'no_claude_key' };

  let synthesis;
  try {
    synthesis = await synthesizeReport(clientLookup.client, collected);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    await upsertReportRow(svc, {
      sessionId,
      userId: user.id,
      status: 'failed',
      errorCode: 'claude_api_error',
      errorMessage: message,
      pdfPath: null,
      modelIds: [...collected.modelsByStage.values()].flat().map((m) => m.id),
    });
    return { ok: false, code: 'claude_api_error', message };
  }

  const stages: SessionReportData['stages'] = [];
  for (const stageType of stagesPresent) {
    const models = collected.modelsByStage.get(stageType) ?? [];
    const cards = await Promise.all(
      models.map(async (m) => {
        const buf = await getCanvasImageBuffer({
          thumbnailUrl: m.thumbnailUrl,
          canvasState: m.canvasState,
        });
        const imageDataUri = buf
          ? `data:image/png;base64,${buf.toString('base64')}`
          : null;
        return {
          id: m.id,
          title: m.title,
          ownerLabel: m.ownerLabel,
          imageDataUri,
          description:
            synthesis.modelDescriptions[m.id] ??
            'No description was generated for this model.',
        };
      }),
    );
    stages.push({ stageType, models: cards });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderSessionReportPdf({
      sessionTitle: collected.sessionTitle,
      orgName: collected.orgName,
      facilitatorName: collected.facilitatorName,
      date: collected.date,
      participantCount: collected.participantCount,
      execSummary: synthesis.execSummary,
      closing: synthesis.closing,
      stages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    await upsertReportRow(svc, {
      sessionId,
      userId: user.id,
      status: 'failed',
      errorCode: 'render_failed',
      errorMessage: message,
      pdfPath: null,
      modelIds: stages.flatMap((s) => s.models.map((m) => m.id)),
    });
    return { ok: false, code: 'render_failed', message };
  }

  // Clean up prior PDFs for this session before uploading the new one.
  const prefix = `${session.org_id}/${sessionId}/`;
  const { data: existing } = await svc.storage.from(STORAGE_BUCKET).list(prefix);
  if (existing && existing.length > 0) {
    await svc.storage
      .from(STORAGE_BUCKET)
      .remove(existing.map((f) => `${prefix}${f.name}`));
  }

  const ts = Date.now();
  const path = `${prefix}${ts}.pdf`;
  const up = await svc.storage
    .from(STORAGE_BUCKET)
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true });
  if (up.error) {
    await upsertReportRow(svc, {
      sessionId,
      userId: user.id,
      status: 'failed',
      errorCode: 'storage_upload_failed',
      errorMessage: up.error.message,
      pdfPath: null,
      modelIds: stages.flatMap((s) => s.models.map((m) => m.id)),
    });
    return { ok: false, code: 'storage_upload_failed', message: up.error.message };
  }

  const generatedAt = new Date().toISOString();
  await upsertReportRow(svc, {
    sessionId,
    userId: user.id,
    status: 'succeeded',
    errorCode: null,
    errorMessage: null,
    pdfPath: path,
    modelIds: stages.flatMap((s) => s.models.map((m) => m.id)),
  });

  const signed = await svc.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data) {
    throw new Error(`signed URL failed: ${signed.error?.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true, pdfUrl: signed.data.signedUrl, generatedAt };
}

export type LatestReportResult =
  | {
      ok: true;
      pdfUrl: string | null;
      status: 'succeeded' | 'failed' | 'pending';
      generatedAt: string;
      errorMessage?: string;
    }
  | { ok: false; code: 'invalid_uuid' | 'unauthenticated' | 'not_facilitator' | 'no_report' };

export async function getLatestSessionReport(
  sessionId: string,
): Promise<LatestReportResult> {
  if (!UUID_RE.test(sessionId)) return { ok: false, code: 'invalid_uuid' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const { data: session } = await supabase
    .from('sessions')
    .select('id, facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return { ok: false, code: 'not_facilitator' };
  if (session.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };

  const { data: row } = await supabase
    .from('session_reports')
    .select('generation_status, pdf_path, error_message, generated_at')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (!row) return { ok: false, code: 'no_report' };

  let pdfUrl: string | null = null;
  if (row.generation_status === 'succeeded' && row.pdf_path) {
    const svc = getServiceSupabaseClient();
    const signed = await svc.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.pdf_path, SIGNED_URL_TTL_SECONDS);
    pdfUrl = signed.data?.signedUrl ?? null;
  }

  return {
    ok: true,
    pdfUrl,
    status: row.generation_status as 'succeeded' | 'failed' | 'pending',
    generatedAt: row.generated_at,
    errorMessage: row.error_message ?? undefined,
  };
}

async function upsertReportRow(
  svc: ReturnType<typeof getServiceSupabaseClient>,
  args: {
    sessionId: string;
    userId: string;
    status: 'succeeded' | 'failed' | 'pending';
    errorCode: string | null;
    errorMessage: string | null;
    pdfPath: string | null;
    modelIds: string[];
  },
) {
  const { error } = await svc
    .from('session_reports')
    .upsert(
      {
        session_id: args.sessionId,
        generation_status: args.status,
        claude_model: CLAUDE_MODEL,
        pdf_path: args.pdfPath,
        error_code: args.errorCode,
        error_message: args.errorMessage,
        included_artifacts: { models: args.modelIds, recordings: [], prompts: [] },
        generated_at: new Date().toISOString(),
        generated_by: args.userId,
      },
      { onConflict: 'session_id' },
    );
  if (error) throw new Error(`session_reports upsert: ${error.message}`);
}
