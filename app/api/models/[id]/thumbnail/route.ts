import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { isPng } from '@/lib/images/validatePng';

const MAX_BYTES = 200 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Ownership + not-trashed check. RLS confines the SELECT to the owner.
  const { data: row, error: selectErr } = await supabase
    .from('models')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (selectErr) {
    if (selectErr.code === 'PGRST116') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let file: Blob | null;
  try {
    const fd = await request.formData();
    const candidate = fd.get('file');
    file = candidate instanceof Blob ? candidate : null;
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }
  if (!file || file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'invalid file' }, { status: 400 });
  }
  if (!(await isPng(file))) {
    return NextResponse.json({ error: 'not a png' }, { status: 400 });
  }

  const path = `${user.id}/${id}.png`;
  const { error: upErr } = await supabase.storage
    .from('model-thumbnails')
    .upload(path, file, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '3600',
    });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: updated, error: updErr } = await supabase
    .from('models')
    .update({
      thumbnail_path: path,
      thumbnail_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('thumbnail_path, thumbnail_updated_at')
    .single();
  if (updErr || !updated) {
    // Storage object was just uploaded but the row update failed; remove the
    // orphan rather than leaving unreferenced bytes in the bucket. Cleanup is
    // best-effort and shouldn't mask the original error.
    const cleanup = await supabase.storage.from('model-thumbnails').remove([path]);
    if (cleanup.error) {
      console.error('failed to clean up orphan thumbnail', path, cleanup.error);
    }
    return NextResponse.json(
      { error: updErr?.message ?? 'update failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    thumbnail_path: updated.thumbnail_path,
    thumbnail_updated_at: updated.thumbnail_updated_at,
  });
}
