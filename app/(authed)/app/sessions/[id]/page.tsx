import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { DeleteSessionButton } from './DeleteSessionButton';
import { SessionStages, type ParticipantModel } from './SessionStages';
import { SessionTitle } from './SessionTitle';
import type { SessionMode, SessionStatus } from '@/lib/sessions/types';
import type { StageRow as LiveStageRow, SessionRow } from '@/components/session/useSessionStages';
import { ParticipantCoachMark } from '@/components/onboarding/ParticipantCoachMark';
import { SpotlightTour } from '@/components/onboarding/SpotlightTour';

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

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      'id, title, org_id, facilitator_id, status, mode, scheduled_for, current_stage_id, organisations:org_id ( id, name )',
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
    organisations: { id: string; name: string } | null;
  };

  // Pull runtime fields alongside metadata so the unified SessionStages
  // component can render status pills and timers on first paint. Once
  // hydrated, `useSessionStages` takes over via Realtime.
  const stagesRes = await supabase
    .from('stages')
    .select(
      'id, session_id, stage_type, position, title, description, duration_seconds, started_at, ended_at, status, paused_at, total_paused_ms, extended_seconds',
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
    for (const m of allModels) {
      if (m.owner_profile_id === user.id) continue;
      const label = m.profiles?.full_name?.trim() || m.profiles?.email || 'Unknown';
      const list = participantsByStage[m.stage_id] ?? [];
      list.push({
        id: m.id,
        title: m.title,
        ownerLabel: label,
      });
      participantsByStage[m.stage_id] = list;
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-10">
        <header data-tour-id="session-header" className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
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
            <SessionTitle
              sessionId={session.id}
              initialTitle={session.title}
              canRename={canManageSession}
            />
          </div>
          {canManageSession ? (
            <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
          ) : null}
        </header>
        <SessionStages
          sessionId={session.id}
          sessionTitle={session.title}
          initialStages={stages}
          initialSession={initialSession}
          ownedModels={ownedModels}
          participantsByStage={participantsByStage}
          canManageSession={canManageSession}
        />
        <SpotlightTour canManageSession={canManageSession} />
        <ParticipantCoachMark />
      </div>
    </main>
  );
}
