import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Builder } from '@/components/builder/Builder';
import { loadInitialBrickFeedback, type ReactionRow } from '@/lib/brickFeedback/loadInitial';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { parseCanvasState } from '@/lib/models/canvasState';
import type { ModelDetail } from '@/lib/models/types';
import type { SessionContext, StageType } from '@/lib/sessions/types';
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
  if (data.session_id && data.stage_id) {
    const [sessionRes, stageRes] = await Promise.all([
      supabase.from('sessions').select('id, title').eq('id', data.session_id).maybeSingle(),
      supabase.from('stages').select('id, stage_type').eq('id', data.stage_id).maybeSingle(),
    ]);
    if (sessionRes.data && stageRes.data) {
      sessionContext = {
        sessionId: sessionRes.data.id,
        sessionTitle: sessionRes.data.title,
        stageType: stageRes.data.stage_type as StageType,
      };
    }
  }

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
  // In live mode every session-org member is a co-editor of the same Y.Doc;
  // ownership only determines the canonical `models.canvas_state` row, not
  // edit permission. Outside live mode, non-owners stay read-only (the
  // existing personal / org-shared / session-spectator behaviour).
  const readOnly = !liveMode && data.owner_profile_id !== user.id;
  const ownerLabel = await loadOwnerLabel(supabase, data.owner_profile_id, readOnly);
  const self = liveMode ? await loadSelfPresence(supabase, user.id) : null;

  // Reactions are scoped to room-backed canvases (the brick-feedback feature
  // is collaborative-only). Non-room designs skip the seed + Builder doesn't
  // mount the overlay.
  let initialReactions: ReactionRow[] | null = null;
  if (data.room_id) {
    const feedback = await loadInitialBrickFeedback(data.id);
    initialReactions = feedback.reactions;
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
    <Builder
      initialModel={initialModel}
      readOnly={readOnly}
      ownerLabel={ownerLabel}
      orgId={data.org_id ?? null}
      sessionContext={sessionContext}
      liveMode={liveMode}
      self={self}
      colourblindMode={colourblindMode}
      sourceStageLabel={sourceStageLabel}
      alreadyImported={alreadyImported}
      initialReactions={initialReactions}
      myProfileId={user.id}
    />
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
