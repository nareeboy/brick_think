import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('model_versions')
    .select('id, label, created_at')
    .eq('model_id', id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ versions: data ?? [] });
}

interface PostBody {
  label?: unknown;
  canvas_state?: unknown;
}

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

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (body.canvas_state === undefined) {
    return NextResponse.json({ error: 'canvas_state required' }, { status: 400 });
  }

  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : null;
  const state = parseCanvasState(body.canvas_state);

  const { data, error } = await supabase
    .from('model_versions')
    .insert({
      model_id: id,
      label: label && label.length > 0 ? label : null,
      canvas_state: state as unknown as Json,
      created_by: user.id,
    })
    .select('id, label, created_at')
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ version: data });
}
