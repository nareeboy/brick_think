'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');
  return { supabase, user };
}

export interface CreateDesignInput {
  orgId: string | null;
  sessionId: string | null;
}

export async function createDesignAction(input: CreateDesignInput): Promise<string> {
  const { orgId, sessionId } = input;
  if (orgId !== null && !UUID_RE.test(orgId)) {
    throw new Error('Invalid orgId');
  }
  if (sessionId !== null && !UUID_RE.test(sessionId)) {
    throw new Error('Invalid sessionId');
  }
  if ((orgId === null) !== (sessionId === null)) {
    throw new Error('Personal designs require both orgId and sessionId to be null');
  }

  const { supabase, user } = await requireUser();

  let stageId: string | null = null;
  if (orgId !== null && sessionId !== null) {
    const { count, error: memberError } = await supabase
      .from('org_memberships')
      .select('profile_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('profile_id', user.id);
    if (memberError) {
      throw new Error(`Membership check failed: ${memberError.message}`);
    }
    if ((count ?? 0) === 0) {
      throw new Error('You are not a member of that organisation');
    }

    const stageRes = await supabase
      .from('stages')
      .select('id, session_id, sessions:session_id (org_id)')
      .eq('session_id', sessionId)
      .eq('position', 0)
      .maybeSingle();
    if (stageRes.error || !stageRes.data) {
      throw new Error('Session not found or has no stages');
    }
    const sessionOrg = (stageRes.data as { sessions: { org_id: string } }).sessions?.org_id;
    if (sessionOrg !== orgId) {
      throw new Error('Session does not belong to the supplied organisation');
    }
    stageId = stageRes.data.id;
  }

  const { data, error } = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: 'Untitled model',
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
      org_id: null,
      session_id: sessionId,
      stage_id: stageId,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to create design: ${error?.message}`);
  }

  revalidatePath('/app/my-designs');
  if (sessionId) revalidatePath(`/app/sessions/${sessionId}`);
  return data.id;
}

export interface DuplicateInput {
  sourceModelId: string;
  orgId: string;
  sessionId: string;
}

export async function duplicateToSessionAction(input: DuplicateInput): Promise<string> {
  const { sourceModelId, orgId, sessionId } = input;
  for (const v of [sourceModelId, orgId, sessionId]) {
    if (!UUID_RE.test(v)) throw new Error('Invalid id');
  }

  const { supabase, user } = await requireUser();

  // 1. Membership pre-check (RLS would also reject, but typed error is nicer).
  const { count, error: memberError } = await supabase
    .from('org_memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('profile_id', user.id);
  if (memberError) {
    throw new Error(`Membership check failed: ${memberError.message}`);
  }
  if ((count ?? 0) === 0) throw new Error('You are not a member of that organisation');

  // 2. Load source — must be owned by caller and not deleted.
  const sourceRes = await supabase
    .from('models')
    .select('id, title, canvas_state, thumbnail_path, owner_profile_id')
    .eq('id', sourceModelId)
    .is('deleted_at', null)
    .single();
  if (sourceRes.error || !sourceRes.data) {
    throw new Error('Source design not found or not owned by you');
  }
  if (sourceRes.data.owner_profile_id !== user.id) {
    throw new Error('You can only send designs you own');
  }

  // 3. Resolve target session's first stage.
  const stageRes = await supabase
    .from('stages')
    .select('id, sessions:session_id ( org_id )')
    .eq('session_id', sessionId)
    .eq('position', 0)
    .maybeSingle();
  if (stageRes.error || !stageRes.data) throw new Error('Session not found or has no stages');
  const sessionOrg = (stageRes.data as { sessions: { org_id: string } }).sessions?.org_id;
  if (sessionOrg !== orgId) throw new Error('Session does not belong to the supplied organisation');

  // 4. Insert the new row. canvas_state is copied verbatim. Thumbnail is not
  //    copied — the next autosave will regenerate it.
  const insertRes = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: sourceRes.data.title,
      canvas_state: sourceRes.data.canvas_state,
      org_id: null,
      session_id: sessionId,
      stage_id: stageRes.data.id,
    })
    .select('id')
    .single();
  if (insertRes.error || !insertRes.data) {
    throw new Error(`Failed to duplicate: ${insertRes.error?.message}`);
  }

  revalidatePath('/app/my-designs');
  revalidatePath(`/app/sessions/${sessionId}`);
  return insertRes.data.id;
}
