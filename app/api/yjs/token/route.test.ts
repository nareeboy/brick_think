import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { createServerSupabaseClient } from '@/lib/db/server';
import { verifyYjsToken } from '@/lib/yjs/jwt';

import { POST } from './route';

const VALID_MODEL_ID = '11111111-1111-1111-1111-111111111111';

function mockSupabase(opts: {
  user: { id: string } | null;
  modelRow: { id: string } | null;
}): void {
  (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: async () => ({ data: opts.modelRow, error: null }),
          }),
        }),
      }),
    }),
  });
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/yjs/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/yjs/token', () => {
  const originalSecret = process.env.YJS_JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YJS_JWT_SECRET = 'a'.repeat(64);
  });

  it('returns 500 when YJS_JWT_SECRET is missing', async () => {
    delete process.env.YJS_JWT_SECRET;
    const res = await POST(makeRequest({ modelId: VALID_MODEL_ID }));
    expect(res.status).toBe(500);
    process.env.YJS_JWT_SECRET = originalSecret;
  });

  it('returns 400 when modelId is malformed', async () => {
    mockSupabase({ user: { id: 'u1' }, modelRow: null });
    const res = await POST(makeRequest({ modelId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when not signed in', async () => {
    mockSupabase({ user: null, modelRow: null });
    const res = await POST(makeRequest({ modelId: VALID_MODEL_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when the model is not readable', async () => {
    mockSupabase({ user: { id: 'u1' }, modelRow: null });
    const res = await POST(makeRequest({ modelId: VALID_MODEL_ID }));
    expect(res.status).toBe(404);
  });

  it('mints a verifiable token on the happy path', async () => {
    mockSupabase({
      user: { id: 'u1' },
      modelRow: { id: VALID_MODEL_ID },
    });
    const res = await POST(makeRequest({ modelId: VALID_MODEL_ID }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; expiresAt: number };
    expect(typeof body.token).toBe('string');
    expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    const claims = await verifyYjsToken({
      token: body.token,
      secret: process.env.YJS_JWT_SECRET!,
    });
    expect(claims.profileId).toBe('u1');
    expect(claims.modelId).toBe(VALID_MODEL_ID);
  });
});
