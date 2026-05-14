import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { createServerSupabaseClient } from '@/lib/db/server';
import { GET } from './route';

function mockSupabase(opts: { user: { id: string } | null; rows: unknown[] }) {
  (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: async () => ({ data: opts.rows, error: null }),
          }),
        }),
      }),
    }),
  });
}

describe('GET /api/models/[id]/share-links', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no user', async () => {
    mockSupabase({ user: null, rows: [] });
    const res = await GET(new Request('http://localhost/x'), { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(401);
  });

  it('returns the owner active share links', async () => {
    mockSupabase({
      user: { id: 'u1' },
      rows: [{ id: 'l1', token: 'tok', created_at: 'x', expires_at: null }],
    });
    const res = await GET(new Request('http://localhost/x'), { params: Promise.resolve({ id: 'm1' }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ links: [{ id: 'l1', token: 'tok', created_at: 'x', expires_at: null }] });
  });
});
