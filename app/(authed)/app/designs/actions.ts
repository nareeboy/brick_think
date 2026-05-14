'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import { parseCanvasState, serializeCanvasState } from '@/lib/models/canvasState';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fdesigns');
  return { supabase, user };
}

export async function createModelAction(): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Failed to load active context: ${profileError?.message}`);
  }

  const { data, error } = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: 'Untitled model',
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
      org_id: profile.active_org_id,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`Failed to create model: ${error?.message}`);
  revalidatePath('/app/designs');
  redirect(`/app/designs/${data.id}`);
}

export async function deleteModelAction(modelId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('models')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', modelId)
    .select('id');
  if (error) throw new Error(`Failed to delete model: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Model not found or not owned by you');
  }
  revalidatePath('/app/designs');
  revalidatePath('/app/designs/trash');
}

export async function restoreModelAction(modelId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('models')
    .update({ deleted_at: null })
    .eq('id', modelId)
    .select('id');
  if (error) throw new Error(`Failed to restore model: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Model not in trash or not owned by you');
  }
  revalidatePath('/app/designs');
  revalidatePath('/app/designs/trash');
}

export async function purgeModelAction(modelId: string): Promise<void> {
  const { supabase } = await requireUser();
  // Capture thumbnail path before deletion — storage.objects has no FK
  // cascade, so we must explicitly clean up after the row is gone.
  const { data, error } = await supabase
    .from('models')
    .delete()
    .eq('id', modelId)
    .not('deleted_at', 'is', null)
    .select('id, thumbnail_path');
  if (error) throw new Error(`Failed to purge model: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Model not in trash or not owned by you');
  }
  const paths = data
    .map((r) => r.thumbnail_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  if (paths.length > 0) {
    const cleanup = await supabase.storage.from('model-thumbnails').remove(paths);
    if (cleanup.error) {
      console.error('failed to clean up thumbnails on purge', paths, cleanup.error);
    }
  }
  revalidatePath('/app/designs/trash');
}

export async function emptyTrashAction(): Promise<void> {
  const { supabase, user } = await requireUser();
  // Capture thumbnail paths before deletion — storage.objects has no FK
  // cascade, so we must explicitly clean up after the rows are gone.
  const { data, error } = await supabase
    .from('models')
    .delete()
    .eq('owner_profile_id', user.id)
    .not('deleted_at', 'is', null)
    .select('id, thumbnail_path');
  if (error) throw new Error(`Failed to empty trash: ${error.message}`);
  const paths = (data ?? [])
    .map((r) => r.thumbnail_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  if (paths.length > 0) {
    const cleanup = await supabase.storage.from('model-thumbnails').remove(paths);
    if (cleanup.error) {
      console.error('failed to clean up thumbnails on empty-trash', paths, cleanup.error);
    }
  }
  revalidatePath('/app/designs/trash');
}

export async function restoreVersionAction(
  modelId: string,
  versionId: string,
): Promise<void> {
  const { supabase, user } = await requireUser();

  // 1. Read current canvas_state and the target version in parallel.
  const [currentRes, versionRes] = await Promise.all([
    supabase.from('models').select('canvas_state').eq('id', modelId).single(),
    supabase
      .from('model_versions')
      .select('canvas_state')
      .eq('id', versionId)
      .eq('model_id', modelId)
      .single(),
  ]);

  if (currentRes.error || !currentRes.data) {
    throw new Error(`Model not found: ${currentRes.error?.message}`);
  }
  if (versionRes.error || !versionRes.data) {
    throw new Error(`Version not found: ${versionRes.error?.message}`);
  }

  const currentState = parseCanvasState(currentRes.data.canvas_state);
  const targetState = parseCanvasState(versionRes.data.canvas_state);

  // 2. Snapshot current state as "Before restore".
  const snapshotRes = await supabase.from('model_versions').insert({
    model_id: modelId,
    label: 'Before restore',
    canvas_state: serializeCanvasState(currentState) as unknown as Json,
    created_by: user.id,
  });
  if (snapshotRes.error) {
    throw new Error(`Snapshot before restore failed: ${snapshotRes.error.message}`);
  }

  // 3. Overwrite the model with the target state.
  const updateRes = await supabase
    .from('models')
    .update({ canvas_state: serializeCanvasState(targetState) as unknown as Json })
    .eq('id', modelId);
  if (updateRes.error) {
    throw new Error(`Restore failed: ${updateRes.error.message}`);
  }

  revalidatePath(`/app/designs/${modelId}`);
}

export async function setModelOrgVisibilityAction(
  modelId: string,
  orgId: string | null,
): Promise<void> {
  const { supabase, user } = await requireUser();

  if (orgId !== null) {
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
  }

  const { data, error } = await supabase
    .from('models')
    .update({ org_id: orgId })
    .eq('id', modelId)
    .is('deleted_at', null)
    .select('id');
  if (error) throw new Error(`Failed to update visibility: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Design not found or not owned by you');
  }

  revalidatePath('/app/designs');
  revalidatePath(`/app/designs/${modelId}`);
}
