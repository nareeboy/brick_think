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
  const { data, error } = await supabase
    .from('models')
    .insert({
      owner_profile_id: user.id,
      title: 'Untitled model',
      canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
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
  const { data, error } = await supabase
    .from('models')
    .delete()
    .eq('id', modelId)
    .not('deleted_at', 'is', null)
    .select('id');
  if (error) throw new Error(`Failed to purge model: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Model not in trash or not owned by you');
  }
  revalidatePath('/app/designs/trash');
}

export async function emptyTrashAction(): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('models')
    .delete()
    .eq('owner_profile_id', user.id)
    .not('deleted_at', 'is', null);
  if (error) throw new Error(`Failed to empty trash: ${error.message}`);
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
