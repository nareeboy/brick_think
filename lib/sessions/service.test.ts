import { describe, expect, test, vi } from 'vitest';

import { createSessionWithStages } from './service';
import type { ServerSupabaseClient } from '@/lib/db/server';

/** A client that fails the test if the service touches the database. */
function unusedClient(): ServerSupabaseClient {
  return new Proxy({} as ServerSupabaseClient, {
    get() {
      throw new Error('service must validate before touching the database');
    },
  });
}

describe('createSessionWithStages', () => {
  test('rejects an empty title without touching the database', async () => {
    const result = await createSessionWithStages({
      supabase: unusedClient(),
      userId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      title: '   ',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_title' });
  });

  test('rejects a non-UUID orgId without touching the database', async () => {
    const result = await createSessionWithStages({
      supabase: unusedClient(),
      userId: '11111111-1111-4111-8111-111111111111',
      orgId: 'not-a-uuid',
      title: 'Discovery Day',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_org' });
  });

  test('returns not_member when the caller is not in the org', async () => {
    // Partial mock: the service only touches the org_memberships select
    // chain; the full ServerSupabaseClient surface is irrelevant here.
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null, count: 0 })),
          })),
        })),
      })),
    } as unknown as ServerSupabaseClient;

    const result = await createSessionWithStages({
      supabase,
      userId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      title: 'Discovery Day',
    });
    expect(result).toEqual({ ok: false, code: 'not_member' });
  });
});
