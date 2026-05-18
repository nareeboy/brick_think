'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState, serializeCanvasState } from '@/lib/models/canvasState';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fmy-designs');
  return { supabase, user };
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
  revalidatePath('/app/my-designs');
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
  revalidatePath('/app/my-designs');
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

export async function restoreVersionAction(modelId: string, versionId: string): Promise<void> {
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
