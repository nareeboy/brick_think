import { describe, expect, test, vi } from 'vitest';

import {
  createSessionWithStages,
  renameSessionById,
  updateSessionMetaById,
  updateStageMetaById,
} from './service';
import type { ServerSupabaseClient } from '@/lib/db/server';
import { SESSION_MODES, SESSION_STATUSES } from '@/lib/sessions/types';

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

describe('renameSessionById', () => {
  test('rejects a non-UUID sessionId', async () => {
    const result = await renameSessionById({
      supabase: unusedClient(),
      sessionId: 'nope',
      title: 'New title',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_session' });
  });

  test('rejects a blank title', async () => {
    const result = await renameSessionById({
      supabase: unusedClient(),
      sessionId: '33333333-3333-4333-8333-333333333333',
      title: '   ',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_title' });
  });
});

describe('updateStageMetaById', () => {
  test('rejects a non-UUID stageId', async () => {
    const result = await updateStageMetaById({
      supabase: unusedClient(),
      stageId: 'nope',
      title: 'Build',
      description: null,
    });
    expect(result).toEqual({ ok: false, code: 'invalid_stage' });
  });
});

describe('updateSessionMetaById', () => {
  test('rejects an unknown status', async () => {
    const result = await updateSessionMetaById({
      supabase: unusedClient(),
      sessionId: '33333333-3333-4333-8333-333333333333',
      status: 'wat' as never,
      mode: 'in_person' as never,
      scheduledFor: null,
    });
    expect(result).toEqual({ ok: false, code: 'invalid_status' });
  });

  test('rejects an unparseable scheduledFor', async () => {
    const result = await updateSessionMetaById({
      supabase: unusedClient(),
      sessionId: '33333333-3333-4333-8333-333333333333',
      status: SESSION_STATUSES[0]!,
      mode: SESSION_MODES[0]!,
      scheduledFor: 'not a date',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_scheduled_for' });
  });
});
