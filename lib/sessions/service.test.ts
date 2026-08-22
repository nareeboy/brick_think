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

const SESSION_ID = '33333333-3333-4333-8333-333333333333';
const STAGE_ID = '44444444-4444-4444-8444-444444444444';

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
      sessionId: SESSION_ID,
      title: '   ',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_title' });
  });

  test('reports not_found when the update matches zero rows', async () => {
    // Partial mock: the service only touches the sessions update chain.
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await renameSessionById({
      supabase,
      sessionId: SESSION_ID,
      title: 'Renamed',
    });
    expect(result).toEqual({ ok: false, code: 'not_found' });
  });

  test('returns ok when the update succeeds', async () => {
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [{ id: SESSION_ID }], error: null }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await renameSessionById({
      supabase,
      sessionId: SESSION_ID,
      title: 'Renamed',
    });
    expect(result).toEqual({ ok: true, data: null });
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

  test('reports not_found when the update matches zero rows', async () => {
    // Partial mock: the service only touches the stages update chain, which
    // ends in .maybeSingle() rather than the array-returning .select() the
    // sessions-table services use.
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await updateStageMetaById({
      supabase,
      stageId: STAGE_ID,
      title: 'Build',
      description: null,
    });
    expect(result).toEqual({ ok: false, code: 'not_found' });
  });

  test('returns the owning sessionId when the update succeeds', async () => {
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: { id: STAGE_ID, session_id: SESSION_ID },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await updateStageMetaById({
      supabase,
      stageId: STAGE_ID,
      title: 'Build',
      description: null,
    });
    expect(result).toEqual({ ok: true, data: { sessionId: SESSION_ID } });
  });
});

describe('updateSessionMetaById', () => {
  test('rejects an unknown status', async () => {
    const result = await updateSessionMetaById({
      supabase: unusedClient(),
      sessionId: SESSION_ID,
      status: 'wat' as never,
      mode: 'in_person' as never,
      scheduledFor: null,
    });
    expect(result).toEqual({ ok: false, code: 'invalid_status' });
  });

  test('rejects an unparseable scheduledFor', async () => {
    const result = await updateSessionMetaById({
      supabase: unusedClient(),
      sessionId: SESSION_ID,
      status: SESSION_STATUSES[0]!,
      mode: SESSION_MODES[0]!,
      scheduledFor: 'not a date',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_scheduled_for' });
  });

  test('reports not_found when the update matches zero rows', async () => {
    // Partial mock: the service only touches the sessions update chain.
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await updateSessionMetaById({
      supabase,
      sessionId: SESSION_ID,
      status: SESSION_STATUSES[0]!,
      mode: SESSION_MODES[0]!,
      scheduledFor: null,
    });
    expect(result).toEqual({ ok: false, code: 'not_found' });
  });

  test('returns ok when the update succeeds', async () => {
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: [{ id: SESSION_ID }], error: null }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await updateSessionMetaById({
      supabase,
      sessionId: SESSION_ID,
      status: SESSION_STATUSES[0]!,
      mode: SESSION_MODES[0]!,
      scheduledFor: null,
    });
    expect(result).toEqual({ ok: true, data: null });
  });
});
