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
    .select(`
      id, title, org_id, created_at,
      org:organisations!sessions_org_id_fkey ( name ),
      facilitator:profiles!sessions_facilitator_id_fkey ( display_name )
    `)
    .eq('id', sessionId)
    .single();
  if (sErr || !session) return null;

  const { data: stages, error: stErr } = await svc
    .from('stages')
    .select('id, stage_type')
    .eq('session_id', sessionId);
  if (stErr) throw new Error(stErr.message);

  const stageTypeById = new Map<string, StageType>(
    (stages ?? []).map((s: { id: string; stage_type: string }) => [s.id, s.stage_type as StageType]),
  );

  const { data: models, error: mErr } = await svc
    .from('models')
    .select(`
      id, title, canvas_state, thumbnail_url, stage_id, room_id, owner_profile_id,
      profile:profiles!models_owner_profile_id_fkey ( display_name ),
      room:stage_rooms ( id, title,
        members:stage_room_members ( profile:profiles ( display_name ) )
      )
    `)
    .eq('session_id', sessionId);
  if (mErr) throw new Error(mErr.message);

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
        members?: Array<{ profile: { display_name: string } | null }>;
      };
      const names = (room.members ?? [])
        .map((mem) => mem.profile?.display_name)
        .filter(Boolean) as string[];
      ownerLabel =
        names.length <= 3
          ? `Room: ${names.join(', ')}`
          : `Room: ${names.slice(0, 2).join(', ')} + ${names.length - 2} more`;
    } else {
      const profile = m.profile as unknown as { display_name: string } | null;
      ownerLabel = profile?.display_name ?? 'Unknown participant';
      if (m.owner_profile_id) participantIds.add(m.owner_profile_id);
    }

    const extractedText = extractText(canvasState).slice(0, 2000);

    const list = modelsByStage.get(stageType) ?? [];
    list.push({
      id: m.id,
      stageType,
      title: m.title ?? 'Untitled',
      canvasState,
      thumbnailUrl: m.thumbnail_url,
      ownerLabel,
      extractedText,
    });
    modelsByStage.set(stageType, list);
  }

  // Order each stage's models by title for deterministic output.
  for (const arr of modelsByStage.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title));
  }

  const orgName = (session.org as unknown as { name: string } | null)?.name ?? 'Unknown org';
  const facilitatorName =
    (session.facilitator as unknown as { display_name: string } | null)?.display_name ?? 'Facilitator';

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
