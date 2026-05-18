import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getCanvasForToken } from './getCanvasForToken';

vi.mock('@/lib/db/serviceRole', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}));

import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

function mockSelectSingle(payload: { data: unknown; error: unknown }): void {
  (createServiceRoleSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => payload,
        }),
      }),
    }),
  });
}

describe('getCanvasForToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns not_found for shape-invalid token without hitting the DB', async () => {
    const spy = createServiceRoleSupabaseClient as unknown as ReturnType<typeof vi.fn>;
    const result = await getCanvasForToken('short');
    expect(result).toEqual({ status: 'not_found' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns not_found for unknown token', async () => {
    mockSelectSingle({ data: null, error: null });
    const result = await getCanvasForToken('a'.repeat(43));
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns not_found when model is soft-deleted', async () => {
    mockSelectSingle({
      data: {
        revoked_at: null,
        expires_at: null,
        models: {
          title: 't',
          canvas_state: { groups: [], bricks: [] },
          deleted_at: '2026-05-13T00:00:00Z',
        },
      },
      error: null,
    });
    const result = await getCanvasForToken('a'.repeat(43));
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns revoked when revoked_at is set', async () => {
    mockSelectSingle({
      data: {
        revoked_at: '2026-05-13T00:00:00Z',
        expires_at: null,
        models: { title: 't', canvas_state: { groups: [], bricks: [] }, deleted_at: null },
      },
      error: null,
    });
    const result = await getCanvasForToken('a'.repeat(43));
    expect(result).toEqual({ status: 'revoked' });
  });

  it('returns expired when expires_at is in the past', async () => {
    mockSelectSingle({
      data: {
        revoked_at: null,
        expires_at: '2000-01-01T00:00:00Z',
        models: { title: 't', canvas_state: { groups: [], bricks: [] }, deleted_at: null },
      },
      error: null,
    });
    const result = await getCanvasForToken('a'.repeat(43));
    expect(result).toEqual({ status: 'expired' });
  });

  it('returns ok with title + parsed canvas state for a live link', async () => {
    mockSelectSingle({
      data: {
        revoked_at: null,
        expires_at: null,
        models: { title: 'My design', canvas_state: { groups: [], bricks: [] }, deleted_at: null },
      },
      error: null,
    });
    const result = await getCanvasForToken('a'.repeat(43));
    expect(result).toEqual({
      status: 'ok',
      title: 'My design',
      canvasState: { groups: [], bricks: [] },
    });
  });
});
