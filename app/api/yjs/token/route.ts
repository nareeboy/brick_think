import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { consumeRateLimit } from '@/lib/rateLimit';
import { mintYjsToken } from '@/lib/yjs/jwt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL_SECONDS = 60;
const RATE_LIMIT_PER_WINDOW = 30;
const RATE_LIMIT_WINDOW_MS = 10_000;

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.YJS_JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'yjs not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const modelId = (body as { modelId?: unknown })?.modelId;
  if (typeof modelId !== 'string' || !UUID_RE.test(modelId)) {
    return NextResponse.json({ error: 'invalid modelId' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const limit = consumeRateLimit(
    `yjs-token:${user.id}`,
    RATE_LIMIT_PER_WINDOW,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate limited' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  // RLS itself answers "is the caller allowed to read this model?" — no row
  // back means no access.
  const { data, error } = await supabase
    .from('models')
    .select('id')
    .eq('id', modelId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { token, expiresAt } = await mintYjsToken({
    profileId: user.id,
    modelId,
    secret,
    ttlSeconds: TTL_SECONDS,
  });
  return NextResponse.json({ token, expiresAt });
}
