import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Builder } from '@/components/builder/Builder';
import type { BuilderScenario } from '@/components/builder/ScenarioPanel';
import { SpotlightBanner } from '@/components/session/SpotlightBanner';
import {
  loadInitialBrickFeedback,
  type CommentRow,
  type ReactionRow,
} from '@/lib/brickFeedback/loadInitial';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { parseCanvasState } from '@/lib/models/canvasState';
import { computeDesignReadOnly } from '@/lib/models/readOnly';
import type { ModelDetail } from '@/lib/models/types';
import type { SessionContext, StageType } from '@/lib/sessions/types';
import { getFacilitatorNotes } from '@/lib/sessions/facilitatorNotes';
import { IMPORT_RULES, isImportTarget } from '@/lib/sessions/stage-import';
import { stageLabel } from '@/lib/sessions/stage-labels';
import { normaliseA11yPreferences } from '@/lib/a11y/preferences';
import { canPlaceLive } from '@/lib/yjs/canPlaceLive';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Builder' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('models')
    .select('title')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  return { title: data?.title ? `${data.title} · Builder` : 'Builder' };
}

export default async function DesignBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    redirect(`/sign-in?reason=unconfigured&next=%2Fapp%2Fdesigns%2F${id}`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=%2Fapp%2Fdesigns%2F${id}`);

  const { data, error } = await supabase
    .from('models')
    .select(
      'id, title, canvas_state, updated_at, owner_profile_id, org_id, session_id, stage_id, room_id',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error || !data) notFound();

  const initialModel: ModelDetail = {
    id: data.id,
    title: data.title,
    updated_at: data.updated_at,
    thumbnail_url: null,
    canvas_state: parseCanvasState(data.canvas_state),
  };

  let sessionContext: SessionContext | null = null;
  let isSessionFacilitator = false;
  let scenario: BuilderScenario | null = null;
  if (data.session_id && data.stage_id) {
    const [sessionRes, stageRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, facilitator_id')
        .eq('id', data.session_id)
        .maybeSingle(),
      supabase
        .from('stages')
        .select('id, stage_type, scenario_id, scenario_title_override, scenario_body_override')
        .eq('id', data.stage_id)
        .maybeSingle(),
    ]);
    if (sessionRes.data && stageRes.data) {
      sessionContext = {
        sessionId: sessionRes.data.id,
        sessionTitle: sessionRes.data.title,
        stageType: stageRes.data.stage_type as StageType,
      };
      isSessionFacilitator = sessionRes.data.facilitator_id === user.id;

      if (stageRes.data.scenario_id) {
        const scenarioRes = await supabase
          .from('scenarios')
          .select('title, body')
          .eq('id', stageRes.data.scenario_id)
          .maybeSingle();
        if (scenarioRes.data) {
          const titleOverride = stageRes.data.scenario_title_override?.trim();
          const bodyOverride = stageRes.data.scenario_body_override?.trim();
          scenario = {
            stageType: stageRes.data.stage_type as StageType,
            title:
              titleOverride && titleOverride.length > 0 ? titleOverride : scenarioRes.data.title,
            body: bodyOverride && bodyOverride.length > 0 ? bodyOverride : scenarioRes.data.body,
          };
        }
      }
    }
  }
  // Facilitators of the parent session see a private-notes drawer in the
  // canvas header. Pre-fetch the notes server-side via the single
  // getFacilitatorNotes projection point (which re-asserts the gate).
  const facilitatorNotes =
    isSessionFacilitator && sessionContext
      ? await getFacilitatorNotes(sessionContext.sessionId)
      : null;

  const prefsRes = await supabase
    .from('profiles')
    .select('a11y_preferences')
    .eq('id', user.id)
    .single();
  const colourblindMode = normaliseA11yPreferences(prefsRes.data?.a11y_preferences).colourblindMode;

  // For room-backed canvases, compute transitive room membership via the
  // service-role-only RPC. Non-members on a room canvas drop to read-only
  // even if they would otherwise be co-editors on a non-room shared_model.
  let isRoomMember: boolean | null = null;
  if (data.room_id) {
    const svc = getServiceSupabaseClient();
    const rpc = await svc.rpc('can_edit_room', { p_profile_id: user.id, p_model_id: data.id });
    if (rpc.error) {
      throw new Error(`can_edit_room failed: ${rpc.error.message}`);
    }
    isRoomMember = Boolean(rpc.data);
  }

  const liveMode = canPlaceLive({
    sessionContext,
    flagEnabled: process.env.NEXT_PUBLIC_YJS_COLLAB_ENABLED === '1',
    isRoomMember,
  });
  // Edit permission. For room-backed canvases this is transitive room
  // membership, NOT ownership: the facilitator owns the room's `models` row but
  // observes read-only unless they're a member (see computeDesignReadOnly). For
  // non-room canvases the owner edits and non-owners stay read-only outside the
  // legacy live-shared_model case.
  const roomBacked = data.room_id !== null;
  const readOnly = computeDesignReadOnly({
    roomId: data.room_id,
    isRoomMember,
    liveMode,
    isOwner: data.owner_profile_id === user.id,
  });
  // Room canvases have no single human "owner" in the UX sense (they're shared
  // breakout rooms), so don't surface an owner name on the read-only chrome —
  // the banner switches to room-aware copy below.
  const ownerLabel = roomBacked
    ? null
    : await loadOwnerLabel(supabase, data.owner_profile_id, readOnly);
  const self = liveMode ? await loadSelfPresence(supabase, user.id) : null;

  // Reactions + comments are scoped to room-backed canvases (the
  // brick-feedback feature is collaborative-only). Non-room designs skip the
  // seed + Builder doesn't mount the overlay. Same call returns both —
  // hydrate together so we only round-trip once.
  let initialReactions: ReactionRow[] | null = null;
  let initialComments: CommentRow[] | null = null;
  if (data.room_id) {
    const feedback = await loadInitialBrickFeedback(data.id);
    initialReactions = feedback.reactions;
    initialComments = feedback.comments;
  }

  let sourceStageLabel: string | null = null;
  let alreadyImported = false;
  // Room-backed canvases auto-import on creation via the room composer
  // (see lib/sessions/stage-rooms.ts), so the manual "Bring in" affordance
  // is suppressed for them.
  if (sessionContext && isImportTarget(sessionContext.stageType) && !data.room_id) {
    sourceStageLabel = stageLabel(IMPORT_RULES[sessionContext.stageType].sourceStageType);
    const { count } = await supabase
      .from('model_imports')
      .select('id', { count: 'exact', head: true })
      .eq('target_model_id', data.id)
      .eq('profile_id', user.id);
    alreadyImported = (count ?? 0) > 0;
  }

  return (
    <>
      {data.session_id && user && (
        <SpotlightBanner sessionId={data.session_id} viewerProfileId={user.id} />
      )}
      <Builder
        initialModel={initialModel}
        readOnly={readOnly}
        roomBacked={roomBacked}
        ownerLabel={ownerLabel}
        orgId={data.org_id ?? null}
        sessionContext={sessionContext}
        liveMode={liveMode}
        self={self}
        colourblindMode={colourblindMode}
        sourceStageLabel={sourceStageLabel}
        alreadyImported={alreadyImported}
        isSessionFacilitator={isSessionFacilitator}
        facilitatorNotes={facilitatorNotes}
        initialReactions={initialReactions}
        initialComments={initialComments}
        myProfileId={user.id}
        scenario={scenario}
      />
    </>
  );
}

async function loadOwnerLabel(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  ownerProfileId: string,
  readOnly: boolean,
): Promise<string | null> {
  if (!readOnly) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', ownerProfileId)
    .single();
  return data?.full_name ?? data?.email ?? null;
}

async function loadSelfPresence(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
): Promise<{ userId: string; displayName: string; avatarUrl: string | null }> {
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  const displayName = data?.full_name ?? data?.email ?? 'Anonymous';
  const avatarUrl = data?.avatar_url ?? null;
  return { userId, displayName, avatarUrl };
}
