import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';

interface PatchBody {
  title?: unknown;
  canvas_state?: unknown;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const update: { title?: string; canvas_state?: Json } = {};

  if (typeof body.title === 'string') {
    const t = body.title.trim();
    if (t.length === 0 || t.length > 200) {
      return NextResponse.json({ error: 'title length out of range' }, { status: 400 });
    }
    update.title = t;
  }

  if (body.canvas_state !== undefined) {
    update.canvas_state = parseCanvasState(body.canvas_state) as unknown as Json;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('models')
    .update(update)
    .eq('id', id)
    .select('id, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ id: data.id, updated_at: data.updated_at });
}
