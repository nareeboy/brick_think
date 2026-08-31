import { describe, expect, test, vi } from 'vitest';

import type { ServerSupabaseClient } from '@/lib/db/server';
import { latestThumbnailUrlByOrg, latestThumbnailUrlBySession } from './latestDesignThumbnails';

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Thenable PostgREST-style query builder: every chained filter/order method
 * returns the chain itself, and awaiting it resolves to `result`. Keeps the
 * tests honest about outcomes (which rows produce which URLs) without
 * hard-coding the exact chain order.
 */
function chain(result: QueryResult) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'in', 'is', 'not', 'order', 'limit', 'eq']) {
    c[m] = () => c;
  }
  c.then = (resolve: (v: QueryResult) => void) => Promise.resolve(result).then(resolve);
  return c;
}

function clientWith(input: {
  models?: QueryResult;
  sessions?: QueryResult;
  signed?: {
    data: { path: string; signedUrl: string }[] | null;
    error: { message: string } | null;
  };
}) {
  const createSignedUrls = vi.fn(
    async (_paths: string[], _ttl: number) => input.signed ?? { data: [], error: null },
  );
  const from = vi.fn((table: string) => {
    if (table === 'models') return chain(input.models ?? { data: [], error: null });
    if (table === 'sessions') return chain(input.sessions ?? { data: [], error: null });
    throw new Error(`unexpected table ${table}`);
  });
  const storageFrom = vi.fn(() => ({ createSignedUrls }));
  // eslint-disable-next-line no-restricted-syntax
  const supabase = { from, storage: { from: storageFrom } } as unknown as ServerSupabaseClient;
  return { supabase, from, storageFrom, createSignedUrls };
}

describe('latestThumbnailUrlBySession', () => {
  test('maps each session to its most recent design thumbnail, cache-busted', async () => {
    const { supabase, createSignedUrls } = clientWith({
      // Ordered newest-first, as the query requests.
      models: {
        data: [
          {
            session_id: 's1',
            thumbnail_path: 'u1/m-new.png',
            thumbnail_updated_at: '2026-08-30T10:00:00Z',
          },
          {
            session_id: 's1',
            thumbnail_path: 'u1/m-old.png',
            thumbnail_updated_at: '2026-08-01T10:00:00Z',
          },
          {
            session_id: 's2',
            thumbnail_path: 'u2/m-other.png',
            thumbnail_updated_at: '2026-08-20T10:00:00Z',
          },
        ],
        error: null,
      },
      signed: {
        data: [
          { path: 'u1/m-new.png', signedUrl: 'https://s/u1/m-new.png?token=a' },
          { path: 'u2/m-other.png', signedUrl: 'https://s/u2/m-other.png?token=b' },
        ],
        error: null,
      },
    });

    const map = await latestThumbnailUrlBySession({ supabase, sessionIds: ['s1', 's2'] });

    expect(map.get('s1')).toBe(
      `https://s/u1/m-new.png?token=a&v=${encodeURIComponent('2026-08-30T10:00:00Z')}`,
    );
    expect(map.get('s2')).toBe(
      `https://s/u2/m-other.png?token=b&v=${encodeURIComponent('2026-08-20T10:00:00Z')}`,
    );
    // Only one path per session is signed — the older design never reaches storage.
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls.mock.calls[0]![0]).toEqual(['u1/m-new.png', 'u2/m-other.png']);
  });

  test('omits sessions with no thumbnailed designs', async () => {
    const { supabase } = clientWith({
      models: {
        data: [
          {
            session_id: 's1',
            thumbnail_path: 'u1/m1.png',
            thumbnail_updated_at: '2026-08-30T10:00:00Z',
          },
        ],
        error: null,
      },
      signed: {
        data: [{ path: 'u1/m1.png', signedUrl: 'https://s/u1/m1.png?token=a' }],
        error: null,
      },
    });

    const map = await latestThumbnailUrlBySession({ supabase, sessionIds: ['s1', 's-empty'] });
    expect(map.has('s-empty')).toBe(false);
    expect(map.size).toBe(1);
  });

  test('degrades to an empty map on query failure — thumbnails are decorative', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { supabase } = clientWith({
      models: { data: null, error: { message: 'boom' } },
    });

    await expect(latestThumbnailUrlBySession({ supabase, sessionIds: ['s1'] })).resolves.toEqual(
      new Map(),
    );
    errorSpy.mockRestore();
  });

  test('returns an empty map for no sessions without touching the database', async () => {
    const from = vi.fn(() => {
      throw new Error('should not query');
    });
    // eslint-disable-next-line no-restricted-syntax
    const supabase = { from, storage: { from } } as unknown as ServerSupabaseClient;

    await expect(latestThumbnailUrlBySession({ supabase, sessionIds: [] })).resolves.toEqual(
      new Map(),
    );
    expect(from).not.toHaveBeenCalled();
  });
});

describe('latestThumbnailUrlByOrg', () => {
  test('resolves org sessions, then keys the newest thumbnail by org', async () => {
    const { supabase } = clientWith({
      sessions: {
        data: [
          { id: 's1', org_id: 'org-a' },
          { id: 's2', org_id: 'org-a' },
          { id: 's3', org_id: 'org-b' },
        ],
        error: null,
      },
      models: {
        data: [
          {
            session_id: 's2',
            thumbnail_path: 'u1/newest.png',
            thumbnail_updated_at: '2026-08-30T10:00:00Z',
          },
          {
            session_id: 's1',
            thumbnail_path: 'u1/older.png',
            thumbnail_updated_at: '2026-08-01T10:00:00Z',
          },
        ],
        error: null,
      },
      signed: {
        data: [{ path: 'u1/newest.png', signedUrl: 'https://s/u1/newest.png?token=a' }],
        error: null,
      },
    });

    const map = await latestThumbnailUrlByOrg({ supabase, orgIds: ['org-a', 'org-b'] });

    expect(map.get('org-a')).toBe(
      `https://s/u1/newest.png?token=a&v=${encodeURIComponent('2026-08-30T10:00:00Z')}`,
    );
    // org-b has a session but no thumbnailed design.
    expect(map.has('org-b')).toBe(false);
  });

  test('returns an empty map when no org has sessions', async () => {
    const { supabase } = clientWith({ sessions: { data: [], error: null } });
    await expect(latestThumbnailUrlByOrg({ supabase, orgIds: ['org-a'] })).resolves.toEqual(
      new Map(),
    );
  });

  test('returns an empty map for no orgs without touching the database', async () => {
    const from = vi.fn(() => {
      throw new Error('should not query');
    });
    // eslint-disable-next-line no-restricted-syntax
    const supabase = { from, storage: { from } } as unknown as ServerSupabaseClient;

    await expect(latestThumbnailUrlByOrg({ supabase, orgIds: [] })).resolves.toEqual(new Map());
    expect(from).not.toHaveBeenCalled();
  });
});
