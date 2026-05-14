import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';
import { parseCanvasState } from '@/lib/models/canvasState';
import type { CanvasState } from '@/lib/models/types';

export type GetCanvasResult =
  | { status: 'ok'; title: string; canvasState: CanvasState }
  | { status: 'expired' }
  | { status: 'revoked' }
  | { status: 'not_found' };

const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

function isLikelyToken(t: string): boolean {
  return typeof t === 'string' && TOKEN_RE.test(t);
}

export async function getCanvasForToken(token: string): Promise<GetCanvasResult> {
  if (!isLikelyToken(token)) return { status: 'not_found' };

  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('model_share_links')
    .select('revoked_at, expires_at, models!inner(title, canvas_state, deleted_at)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return { status: 'not_found' };

  const model = data.models;
  if (model.deleted_at !== null) return { status: 'not_found' };

  if (data.revoked_at !== null) return { status: 'revoked' };
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return { status: 'expired' };
  }
  return {
    status: 'ok',
    title: model.title,
    canvasState: parseCanvasState(model.canvas_state),
  };
}
