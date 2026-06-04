import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { getFacilitatorNotes } from '@/lib/sessions/facilitatorNotes';
import { getNarrationsForModelIds } from '@/lib/sessions/modelNarration';
import { IMPORT_RULES, isImportTarget } from '@/lib/sessions/stage-import';

import { getLatestSessionReport } from '../report-actions';

import { DeleteSessionButton } from './DeleteSessionButton';
import { FacilitatorNotesCard } from './FacilitatorNotesCard';
import GenerateReportButton from './GenerateReportButton';
import { GoToMyCanvasButton } from './GoToMyCanvasButton';
import { PreSessionChecklist } from './PreSessionChecklist';
import { RosterButton } from '@/components/session/RosterButton';
import { SessionRoleChip } from './SessionRoleChip';
import { SessionStages, type ParticipantModel } from './SessionStages';
import { SessionTitle } from './SessionTitle';
import type { OrgMemberSummary } from './ManageRoomsDialog';
import type { UpstreamRoomSummary } from './ManageDownstreamRoomsDialog';
import type { StageRoomSummary } from './RoomsPanel';
import type { Scenario } from '@/lib/scenarios/types';
import type { SessionMode, SessionStatus, StageType } from '@/lib/sessions/types';
import type { StageRow as LiveStageRow, SessionRow } from '@/components/session/useSessionStages';
import { FacilitatorChecklist } from '@/components/onboarding/FacilitatorChecklist';
import { ParticipantCoachMark } from '@/components/onboarding/ParticipantCoachMark';
import { SpotlightTour } from '@/components/onboarding/SpotlightTour';
import { StartModelSpotlight } from '@/components/onboarding/StartModelSpotlight';
import { computeFacilitatorChecklistProgress } from '@/lib/onboarding/facilitatorProgress';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Session' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('sessions').select('title').eq('id', id).maybeSingle();
  return { title: data?.title ? `${data.title} · Session` : 'Session' };
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { id } = await params;
  const { onboarding } = await searchParams;
  const startModelSpotlightActive = onboarding === 'start-model';
  if (!isSupabaseConfigured()) {
    redirect(`/sign-in?reason=unconfigured&next=%2Fapp%2Fsessions%2F${id}`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=%2Fapp%2Fsessions%2F${id}`);

  const sessionRes = await supabase
    .from('sessions')
    .select(
      'id, title, org_id, facilitator_id, status, mode, scheduled_for, current_stage_id, brief_text, pre_session_check, join_code, organisations:org_id ( id, name )',
    )
    .eq('id', id)
    .maybeSingle();
  if (sessionRes.error || !sessionRes.data) notFound();
  const session = sessionRes.data as {
    id: string;
    title: string;
    org_id: string;
    // Nullable once the facilitator's account is deleted (migration
    // 20260516120000 sets the FK to ON DELETE SET NULL).
    facilitator_id: string | null;
    status: SessionStatus;
    mode: SessionMode;
    scheduled_for: string | null;
    current_stage_id: string | null;
    brief_text: string | null;
    pre_session_check: Record<string, unknown> | null;
    join_code: string | null;
    organisations: { id: string; name: string } | null;
  };

  // Pull runtime fields alongside metadata so the unified SessionStages
  // component can render status pills and timers on first paint. Once
  // hydrated, `useSessionStages` takes over via Realtime.
  const stagesRes = await supabase
    .from('stages')
    .select(
      'id, session_id, stage_type, position, title, description, duration_seconds, started_at, ended_at, status, paused_at, total_paused_ms, extended_seconds, scenario_id, scenario_body_override, scenario_title_override',
    )
    .eq('session_id', id)
    .order('position', { ascending: true });
  if (stagesRes.error) {
    throw new Error(`Failed to load stages: ${stagesRes.error.message}`);
  }
  const stages = (stagesRes.data ?? []) as unknown as LiveStageRow[];
  const initialSession: SessionRow = {
    id: session.id,
    current_stage_id: session.current_stage_id,
    status: session.status,
  };

  // Manage permission mirrors the sessions UPDATE/DELETE RLS: facilitator OR
  // org admin. Drives rename, delete, edit-meta, and the participants view —
  // anything that goes beyond "viewing the session as a participant".
  let canManageSession = session.facilitator_id === user.id;
  if (!canManageSession) {
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', session.org_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    canManageSession =
      membership !== null &&
      membership !== undefined &&
      (membership.role === 'owner' || membership.role === 'admin');
  }

  // Facilitators / admins see every participant's models grouped under the
  // stage; participants see only their own. The RLS SELECT policy on `models`
  // already permits session-org-members to read all session-scoped rows, so
  // the gate here is purely UX (don't show participants a roster they can't
  // act on anyway).
  const modelsQueryBase = supabase
    .from('models')
    .select(
      'id, title, updated_at, stage_id, owner_profile_id, profiles:owner_profile_id ( email, full_name )',
    )
    .eq('session_id', id)
    .is('deleted_at', null);
  const modelsRes = canManageSession
    ? await modelsQueryBase
    : await modelsQueryBase.eq('owner_profile_id', user.id);
  if (modelsRes.error) {
    throw new Error(`Failed to load session models: ${modelsRes.error.message}`);
  }

  interface ModelRowFromQuery {
    id: string;
    title: string;
    updated_at: string;
    stage_id: string | null;
    owner_profile_id: string;
    profiles: { email: string; full_name: string | null } | null;
  }
  const allModels = ((modelsRes.data ?? []) as unknown as ModelRowFromQuery[]).filter(
    (m): m is ModelRowFromQuery & { stage_id: string } => m.stage_id !== null,
  );
  const ownedModels = allModels
    .filter((m) => m.owner_profile_id === user.id)
    .map(({ id: rowId, title, updated_at, stage_id }) => ({
      id: rowId,
      title,
      updated_at,
      stage_id,
    }));
  const participantsByStage: Record<string, ParticipantModel[]> = {};
  if (canManageSession) {
    const participantModels = allModels.filter((m) => m.owner_profile_id !== user.id);
    // The facilitator / org-manager can read every model in the session, so a
    // batch read of their narrations is authorized — the canManageSession guard
    // IS the gate (the helper itself does no per-model check).
    const narrationByModelId = await getNarrationsForModelIds(participantModels.map((m) => m.id));
    for (const m of participantModels) {
      const label = m.profiles?.full_name?.trim() || m.profiles?.email || 'Unknown';
      const list = participantsByStage[m.stage_id] ?? [];
      list.push({
        id: m.id,
        title: m.title,
        ownerLabel: label,
        ownerProfileId: m.owner_profile_id,
        narration: narrationByModelId.get(m.id) ?? null,
      });
      participantsByStage[m.stage_id] = list;
    }
  }

  // Fetch room layout across every stage_id. Each room carries its members
  // (shared_model) and its upstream source rooms (system_model / guiding_principles).
  const stageIds = stages.map((s) => s.id);
  const roomsByStageId: Record<string, StageRoomSummary[]> = {};
  const upstreamRoomsByStageId: Record<string, UpstreamRoomSummary[]> = {};
  const upstreamStageTypeByStageId: Record<string, StageType> = {};
  const myRoomIdByStageId: Record<string, string | null> = {};
  let orgMembers: OrgMemberSummary[] = [];
  if (stageIds.length > 0) {
    const roomsRes = await supabase
      .from('stage_rooms')
      .select('id, stage_id, position, title')
      .in('stage_id', stageIds)
      .order('position', { ascending: true });
    if (roomsRes.error) {
      throw new Error(`Failed to load rooms: ${roomsRes.error.message}`);
    }
    const rooms = roomsRes.data ?? [];
    const roomIds = rooms.map((r) => r.id);
    let roomModels: { id: string; room_id: string | null }[] = [];
    let roomMembers: { room_id: string; profile_id: string }[] = [];
    let roomSources: { room_id: string; source_room_id: string }[] = [];
    if (roomIds.length > 0) {
      const [modelsForRooms, membersForRooms, sourcesForRooms] = await Promise.all([
        supabase.from('models').select('id, room_id').in('room_id', roomIds).is('deleted_at', null),
        supabase.from('stage_room_members').select('room_id, profile_id').in('room_id', roomIds),
        supabase
          .from('stage_room_sources')
          .select('room_id, source_room_id')
          .in('room_id', roomIds),
      ]);
      if (modelsForRooms.error) {
        throw new Error(`Failed to load room canvases: ${modelsForRooms.error.message}`);
      }
      if (membersForRooms.error) {
        throw new Error(`Failed to load room members: ${membersForRooms.error.message}`);
      }
      if (sourcesForRooms.error) {
        throw new Error(`Failed to load room sources: ${sourcesForRooms.error.message}`);
      }
      roomModels = (modelsForRooms.data ?? []).filter(
        (r): r is { id: string; room_id: string } => r.room_id !== null,
      );
      roomMembers = (membersForRooms.data ?? []) as { room_id: string; profile_id: string }[];
      roomSources = (sourcesForRooms.data ?? []) as { room_id: string; source_room_id: string }[];
    }
    const modelByRoomId = new Map(roomModels.map((m) => [m.room_id as string, m.id]));
    const membersByRoomId = new Map<string, string[]>();
    for (const m of roomMembers) {
      const list = membersByRoomId.get(m.room_id) ?? [];
      list.push(m.profile_id);
      membersByRoomId.set(m.room_id, list);
    }
    const sourcesByRoomId = new Map<string, string[]>();
    for (const s of roomSources) {
      const list = sourcesByRoomId.get(s.room_id) ?? [];
      list.push(s.source_room_id);
      sourcesByRoomId.set(s.room_id, list);
    }
    for (const r of rooms) {
      const modelId = modelByRoomId.get(r.id);
      if (!modelId) continue;
      const list = roomsByStageId[r.stage_id] ?? [];
      list.push({
        id: r.id,
        position: r.position,
        title: r.title,
        modelId,
        memberIds: membersByRoomId.get(r.id) ?? [],
        sourceRoomIds: sourcesByRoomId.get(r.id) ?? [],
      });
      roomsByStageId[r.stage_id] = list;
    }

    // For each downstream stage (system_model, guiding_principles): expose
    // the upstream stage's rooms so the modal can populate the picker.
    const stageById = new Map(stages.map((s) => [s.id, s] as const));
    for (const stage of stages) {
      const stageType = stage.stage_type as StageType;
      if (stageType !== 'system_model' && stageType !== 'guiding_principles') continue;
      if (!isImportTarget(stageType)) continue;
      const upstreamType = IMPORT_RULES[stageType].sourceStageType;
      const upstreamStage = stages.find((s) => s.stage_type === upstreamType);
      if (!upstreamStage) continue;
      upstreamStageTypeByStageId[stage.id] = upstreamType;
      const upstreamSummaries = (roomsByStageId[upstreamStage.id] ?? []).map((r) => ({
        id: r.id,
        position: r.position,
        title: r.title,
      }));
      upstreamRoomsByStageId[stage.id] = upstreamSummaries;
    }
    // Silence "unused" without dropping the lookup: stageById is reserved
    // for future cross-stage validation in this block.
    void stageById;

    // Compute the current user's room id per stage. shared_model is direct
    // membership lookup; downstream stages use public.can_edit_room (service
    // role) on each room's model id. With workshop-scale N (<10 rooms/stage)
    // the per-room RPC fan-out is cheap.
    const svc = getServiceSupabaseClient();
    for (const stage of stages) {
      const stageType = stage.stage_type as StageType;
      const stageRooms = roomsByStageId[stage.id] ?? [];
      if (stageRooms.length === 0) {
        myRoomIdByStageId[stage.id] = null;
        continue;
      }
      if (stageType === 'shared_model') {
        const found = stageRooms.find((r) => r.memberIds.includes(user.id)) ?? null;
        myRoomIdByStageId[stage.id] = found?.id ?? null;
        continue;
      }
      if (stageType === 'system_model' || stageType === 'guiding_principles') {
        let assigned: string | null = null;
        for (const room of stageRooms) {
          const rpc = await svc.rpc('can_edit_room', {
            p_profile_id: user.id,
            p_model_id: room.modelId,
          });
          if (rpc.error) {
            throw new Error(`can_edit_room failed: ${rpc.error.message}`);
          }
          if (rpc.data) {
            assigned = room.id;
            break;
          }
        }
        myRoomIdByStageId[stage.id] = assigned;
        continue;
      }
      myRoomIdByStageId[stage.id] = null;
    }
  }

  // Members power the room-assignment modal. We need the union of org members
  // and active session participants — code-joined participants don't have an
  // org_memberships row but must still be assignable to a room. Profile RLS
  // (`can_see_profile_via_session`) already lets the facilitator read both
  // sets, so a direct join works for either path.
  const [orgMembersRes, sessionParticipantsRes] = await Promise.all([
    supabase
      .from('org_memberships')
      .select('profile_id, profiles:profile_id ( email, full_name )')
      .eq('org_id', session.org_id),
    supabase
      .from('session_participants')
      .select('profile_id, profiles:profile_id ( email, full_name )')
      .eq('session_id', session.id)
      .is('removed_at', null),
  ]);
  if (orgMembersRes.error) {
    throw new Error(`Failed to load org members: ${orgMembersRes.error.message}`);
  }
  if (sessionParticipantsRes.error) {
    throw new Error(`Failed to load session participants: ${sessionParticipantsRes.error.message}`);
  }
  const memberById = new Map<string, OrgMemberSummary>();
  const addRow = (row: {
    profile_id: string;
    profiles: { email: string; full_name: string | null } | null;
  }) => {
    if (memberById.has(row.profile_id)) return;
    memberById.set(row.profile_id, {
      id: row.profile_id,
      label: row.profiles?.full_name?.trim() || row.profiles?.email || 'Unknown',
    });
  };
  for (const row of (orgMembersRes.data ?? []) as unknown as {
    profile_id: string;
    profiles: { email: string; full_name: string | null } | null;
  }[]) {
    addRow(row);
  }
  for (const row of (sessionParticipantsRes.data ?? []) as unknown as {
    profile_id: string;
    profiles: { email: string; full_name: string | null } | null;
  }[]) {
    addRow(row);
  }
  // The facilitator observes rooms read-only and never builds in them, so they
  // must not appear in the room-assignment picker as a participant to assign.
  orgMembers = Array.from(memberById.values()).filter(
    (member) => member.id !== session.facilitator_id,
  );

  // Scenarios: RLS filters to templates + caller-org rows. One query covers
  // every stage_type — group locally so the picker can lookup by stage_type
  // and the per-stage row can lookup its picked scenario by id.
  const scenarioRes = await supabase
    .from('scenarios')
    .select('id, org_id, stage_type, title, body, tags, duration_minutes, is_template, created_at')
    .order('stage_type', { ascending: true })
    .order('title', { ascending: true });
  if (scenarioRes.error) {
    throw new Error(`Failed to load scenarios: ${scenarioRes.error.message}`);
  }
  const allScenarios = (scenarioRes.data ?? []) as unknown as Scenario[];

  const scenariosByStageType: Partial<Record<StageType, Scenario[]>> = {};
  const scenarioById = new Map<string, Scenario>();
  for (const s of allScenarios) {
    const bucket = scenariosByStageType[s.stage_type] ?? [];
    bucket.push(s);
    scenariosByStageType[s.stage_type] = bucket;
    scenarioById.set(s.id, s);
  }
  const pickedScenarioByStageId: Record<string, Scenario | null> = {};
  for (const stage of stages) {
    pickedScenarioByStageId[stage.id] = stage.scenario_id
      ? (scenarioById.get(stage.scenario_id) ?? null)
      : null;
  }

  // Hydrate the Generate report button's initial state from the most recent
  // session_reports row. Only fetch for facilitators on completed sessions —
  // those are the only users who'll see the button.
  const reportLatest =
    canManageSession && session.status === 'completed'
      ? await getLatestSessionReport(session.id)
      : null;

  // Private notes are facilitator-only (not org-admin), and the helper itself
  // enforces that gate — call it for the facilitator's view and skip the
  // round-trip otherwise.
  const isFacilitator = session.facilitator_id === user.id;
  const facilitatorNotes = isFacilitator ? await getFacilitatorNotes(session.id) : null;

  // Onboarding walkthrough — the same checklist shown on /app/my-designs follows
  // the user here, where step 3 ("start your first model") actually happens.
  // Point step 3's "next" link at the session they're already on.
  const onboardingProgress = {
    ...(await computeFacilitatorChecklistProgress(supabase, user.id)),
    firstSessionId: session.id,
  };

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-10">
        <FacilitatorChecklist progress={onboardingProgress} />
        <header data-tour-id="session-header" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-6">
              <SessionRoleChip isFacilitator={session.facilitator_id === user.id} />
            </div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              <Link href="/app/orgs" className="underline-offset-2 hover:underline">
                Organisations
              </Link>
              <span aria-hidden="true" className="mx-1.5 text-zinc-400">
                /
              </span>
              {session.organisations ? (
                <Link
                  href={`/app/orgs/${session.organisations.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {session.organisations.name}
                </Link>
              ) : (
                <span>Unknown org</span>
              )}
              <span aria-hidden="true" className="mx-1.5 text-zinc-400">
                /
              </span>
              Session · {session.status}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <SessionTitle
                sessionId={session.id}
                initialTitle={session.title}
                canRename={canManageSession}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GoToMyCanvasButton sessionId={session.id} currentStageId={session.current_stage_id} />
            {canManageSession ? (
              <>
                {session.join_code ? (
                  <RosterButton sessionId={session.id} joinCode={session.join_code} />
                ) : null}
                {session.status === 'completed' ? (
                  <GenerateReportButton
                    sessionId={session.id}
                    initialPdfUrl={reportLatest && reportLatest.ok ? reportLatest.pdfUrl : null}
                    initialGeneratedAt={
                      reportLatest && reportLatest.ok ? reportLatest.generatedAt : null
                    }
                    initialError={
                      reportLatest && reportLatest.ok && reportLatest.status === 'failed'
                        ? reportLatest.errorMessage
                        : undefined
                    }
                  />
                ) : null}
                <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
              </>
            ) : null}
          </div>
        </header>
        <PreSessionChecklist
          sessionId={session.id}
          sessionStatus={session.status}
          briefText={session.brief_text ?? ''}
          preSessionCheck={(session.pre_session_check as Record<string, unknown>) ?? {}}
          canManage={canManageSession}
          stages={stages.map((s) => ({
            id: s.id,
            stage_type: s.stage_type as StageType,
            scenarioId: s.scenario_id ?? null,
            title: s.title,
          }))}
          scenariosByStageType={scenariosByStageType}
        />
        {isFacilitator ? (
          <FacilitatorNotesCard sessionId={session.id} initialValue={facilitatorNotes} />
        ) : null}
        <SessionStages
          sessionId={session.id}
          sessionTitle={session.title}
          initialStages={stages}
          initialSession={initialSession}
          ownedModels={ownedModels}
          participantsByStage={participantsByStage}
          canManageSession={canManageSession}
          roomsByStageId={roomsByStageId}
          orgMembers={orgMembers}
          upstreamRoomsByStageId={upstreamRoomsByStageId}
          upstreamStageTypeByStageId={upstreamStageTypeByStageId}
          myRoomIdByStageId={myRoomIdByStageId}
          currentUserId={user.id}
          pickedScenarioByStageId={pickedScenarioByStageId}
        />
        <SpotlightTour canManageSession={canManageSession} suppressed={startModelSpotlightActive} />
        <Suspense fallback={null}>
          <StartModelSpotlight />
        </Suspense>
        <ParticipantCoachMark />
      </div>
    </main>
  );
}
