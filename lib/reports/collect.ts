import type { ServiceSupabaseClient } from '@/lib/db/service';
import { parseCanvasState } from '@/lib/models/canvasState';
import type { CanvasState } from '@/lib/models/types';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

export interface CollectedModel {
  id: string;
  stageType: StageType;
  title: string;
  canvasState: CanvasState;
  thumbnailUrl: string | null;
  ownerLabel: string;
  extractedText: string;
  /** The model's saved narration transcript (display text), if any. */
  narration: { transcript: string; cleaned: boolean } | null;
}

export interface CollectedSession {
  sessionId: string;
  sessionTitle: string;
  orgId: string;
  orgName: string;
  facilitatorName: string;
  date: string;
  participantCount: number;
  modelsByStage: Map<StageType, CollectedModel[]>;
}

export async function collectSession(
  svc: ServiceSupabaseClient,
  sessionId: string,
): Promise<CollectedSession | null> {
  const { data: session, error: sErr } = await svc
    .from('sessions')
    .select(
      `
      id, title, org_id, created_at,
      org:organisations!sessions_org_id_fkey ( name ),
      facilitator:profiles!sessions_facilitator_id_fkey ( full_name )
    `,
    )
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return null;

  const { data: stages, error: stErr } = await svc
    .from('stages')
    .select('id, stage_type')
    .eq('session_id', sessionId);
  if (stErr) throw new Error(stErr.message);

  const stageTypeById = new Map<string, StageType>(
    (stages ?? []).map((s: { id: string; stage_type: string }) => [
      s.id,
      s.stage_type as StageType,
    ]),
  );

  const { data: models, error: mErr } = await svc
    .from('models')
    .select(
      `
      id, title, canvas_state, thumbnail_path, stage_id, room_id, owner_profile_id,
      profile:profiles!models_owner_profile_id_fkey ( full_name ),
      room:stage_rooms ( id, title,
        members:stage_room_members ( profile:profiles ( full_name ) )
      ),
      narrations:model_narrations ( transcript, cleaned )
    `,
    )
    .eq('session_id', sessionId);
  if (mErr) throw new Error(mErr.message);

  // Resolve thumbnail signed URLs for any models that have one. The PDF
  // pipeline can fall back to an SVG render when the thumbnail is missing,
  // so this is best-effort — if signing fails we just leave the URL null.
  const THUMBNAIL_BUCKET = 'model-thumbnails';
  const THUMBNAIL_TTL_SECONDS = 60 * 60;
  const paths = (models ?? [])
    .map((m: { thumbnail_path: string | null }) => m.thumbnail_path)
    .filter((p: string | null): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await svc.storage
      .from(THUMBNAIL_BUCKET)
      .createSignedUrls(paths, THUMBNAIL_TTL_SECONDS);
    if (signed.data) {
      for (const entry of signed.data) {
        if (entry.path && entry.signedUrl) {
          urlByPath.set(entry.path, entry.signedUrl);
        }
      }
    }
  }

  const participantIds = new Set<string>();
  const modelsByStage = new Map<StageType, CollectedModel[]>();

  for (const m of models ?? []) {
    const stageType = m.stage_id ? stageTypeById.get(m.stage_id) : undefined;
    if (!stageType) continue;
    const canvasState = parseCanvasState(m.canvas_state);

    let ownerLabel: string;
    if (m.room_id && m.room) {
      const room = m.room as unknown as {
        title: string | null;
        members?: Array<{ profile: { full_name: string | null } | null }>;
      };
      const names = (room.members ?? [])
        .map((mem) => mem.profile?.full_name)
        .filter(Boolean) as string[];
      ownerLabel =
        names.length <= 3
          ? `Room: ${names.join(', ')}`
          : `Room: ${names.slice(0, 2).join(', ')} + ${names.length - 2} more`;
    } else {
      const profile = m.profile as unknown as { full_name: string | null } | null;
      ownerLabel = profile?.full_name ?? 'Unknown participant';
      if (m.owner_profile_id) participantIds.add(m.owner_profile_id);
    }

    const extractedText = extractText(canvasState).slice(0, 2000);

    // model_narrations.model_id is UNIQUE, so PostgREST embeds it one-to-one (an
    // object or null) rather than as an array — normalise both shapes.
    const narrationEmbed = m.narrations as unknown as
      | { transcript: string; cleaned: boolean }
      | Array<{ transcript: string; cleaned: boolean }>
      | null
      | undefined;
    const narrationRow = Array.isArray(narrationEmbed) ? narrationEmbed[0] : narrationEmbed;

    const list = modelsByStage.get(stageType) ?? [];
    list.push({
      id: m.id,
      stageType,
      title: m.title ?? 'Untitled',
      canvasState,
      thumbnailUrl: m.thumbnail_path ? (urlByPath.get(m.thumbnail_path) ?? null) : null,
      ownerLabel,
      extractedText,
      narration: narrationRow
        ? { transcript: narrationRow.transcript, cleaned: narrationRow.cleaned }
        : null,
    });
    modelsByStage.set(stageType, list);
  }

  // Order each stage's models by title for deterministic output.
  for (const arr of modelsByStage.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title));
  }

  const orgName = (session.org as unknown as { name: string } | null)?.name ?? 'Unknown org';
  const facilitatorName =
    (session.facilitator as unknown as { full_name: string | null } | null)?.full_name ??
    'Facilitator';

  return {
    sessionId: session.id,
    sessionTitle: session.title ?? 'Untitled session',
    orgId: session.org_id,
    orgName,
    facilitatorName,
    date: new Date(session.created_at).toISOString().slice(0, 10),
    participantCount: participantIds.size,
    modelsByStage,
  };
}

export function orderedStages(modelsByStage: Map<StageType, CollectedModel[]>): StageType[] {
  return CANONICAL_STAGE_TYPES.filter((s) => (modelsByStage.get(s) ?? []).length > 0);
}

function extractText(state: CanvasState): string {
  const out: string[] = [];
  for (const brick of state.bricks ?? []) {
    const text = (brick as unknown as { text?: string }).text;
    if (text && typeof text === 'string') out.push(text);
  }
  return out.join('\n');
}
