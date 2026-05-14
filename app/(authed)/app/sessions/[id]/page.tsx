import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { StageRow } from '@/lib/sessions/types';

import { DeleteSessionButton } from './DeleteSessionButton';
import { SessionStageList, type ParticipantModel } from './SessionStageList';
import { SessionTitle } from './SessionTitle';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Session' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('sessions')
    .select('title')
    .eq('id', id)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Session` : 'Session' };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    .select('id, title, org_id, facilitator_id, status')
    .eq('id', id)
    .maybeSingle();
  if (sessionRes.error || !sessionRes.data) notFound();
  const session = sessionRes.data;

  const stagesRes = await supabase
    .from('stages')
    .select('id, session_id, stage_type, position')
    .eq('session_id', id)
    .order('position', { ascending: true });
  if (stagesRes.error) {
    throw new Error(`Failed to load stages: ${stagesRes.error.message}`);
  }
  const stages = (stagesRes.data ?? []) as StageRow[];

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
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
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
        <SessionStageList
          sessionId={session.id}
          stages={stages}
          ownedModels={ownedModels}
          participantsByStage={participantsByStage}
        />
      </div>
    </main>
  );
}
