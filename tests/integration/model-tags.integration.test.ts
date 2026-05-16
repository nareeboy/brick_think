// Integration coverage for the model_tags table + setModelTagsAction.
//
// Verifies:
//   * Owner can read / write tags on their own design via the action.
//   * Tag write is idempotent (whole-set replace semantics).
//   * Non-owners cannot read tags on designs they don't otherwise have
//     access to (RLS join through public.models).
//   * Invalid tag shapes are dropped silently by normalisation, not 500.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    throw new Error(`__redirect__:${url ?? ''}`);
  },
}));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

import {
  createDesignAction,
  setModelTagsAction,
} from '@/app/(authed)/app/my-designs/actions';

interface Fixture {
  owner: TestUser;
  outsider: TestUser;
  outsiderOrg: TestOrg;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const outsider = await createTestUser();
  // Outsider needs a home org so cleanup works the same way; not used otherwise.
  const outsiderOrg = await createTestOrg({ ownerId: outsider.id });
  fx = { owner, outsider, outsiderOrg };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('setModelTagsAction', () => {
  test('writes a tag set and reads it back via the admin client', async () => {
    currentClient = await signInAs(fx.owner);
    const modelId = await createDesignAction({ orgId: null, sessionId: null });
    try {
      const saved = await setModelTagsAction(modelId, ['design', 'lego-bricks']);
      expect(saved).toEqual(['design', 'lego-bricks']);

      const admin = getAdminClient();
      const verify = await admin
        .from('model_tags')
        .select('tag')
        .eq('model_id', modelId)
        .order('tag', { ascending: true });
      expect(verify.error).toBeNull();
      expect((verify.data ?? []).map((r) => r.tag)).toEqual(['design', 'lego-bricks']);
    } finally {
      await getAdminClient().from('models').delete().eq('id', modelId);
    }
  });

  test('whole-set replace removes tags absent from the new list', async () => {
    currentClient = await signInAs(fx.owner);
    const modelId = await createDesignAction({ orgId: null, sessionId: null });
    try {
      await setModelTagsAction(modelId, ['a', 'b', 'c']);
      const after = await setModelTagsAction(modelId, ['b', 'd']);
      expect(after).toEqual(['b', 'd']);

      const verify = await getAdminClient()
        .from('model_tags')
        .select('tag')
        .eq('model_id', modelId)
        .order('tag', { ascending: true });
      expect((verify.data ?? []).map((r) => r.tag)).toEqual(['b', 'd']);
    } finally {
      await getAdminClient().from('models').delete().eq('id', modelId);
    }
  });

  test('drops invalid tag values via normalisation', async () => {
    currentClient = await signInAs(fx.owner);
    const modelId = await createDesignAction({ orgId: null, sessionId: null });
    try {
      const saved = await setModelTagsAction(modelId, [
        'GoodOne',     // -> 'goodone'
        '  Spaced ',   // -> 'spaced'
        '',            // dropped
        '-bad',        // dropped (leading hyphen)
        'x'.repeat(40), // dropped (length)
      ]);
      expect(saved.sort()).toEqual(['goodone', 'spaced']);
    } finally {
      await getAdminClient().from('models').delete().eq('id', modelId);
    }
  });

  test('non-owner reading tags via SELECT returns zero rows (RLS)', async () => {
    currentClient = await signInAs(fx.owner);
    const modelId = await createDesignAction({ orgId: null, sessionId: null });
    try {
      await setModelTagsAction(modelId, ['secret']);

      const outsiderClient = await signInAs(fx.outsider);
      const probe = await outsiderClient
        .from('model_tags')
        .select('tag')
        .eq('model_id', modelId);
      expect(probe.error).toBeNull();
      expect(probe.data ?? []).toEqual([]);
    } finally {
      await getAdminClient().from('models').delete().eq('id', modelId);
    }
  });

  test('non-owner writing tags is refused by ownership pre-check', async () => {
    currentClient = await signInAs(fx.owner);
    const modelId = await createDesignAction({ orgId: null, sessionId: null });
    try {
      currentClient = await signInAs(fx.outsider);
      await expect(setModelTagsAction(modelId, ['nope'])).rejects.toThrow(
        /not owned by you|not found/i,
      );
    } finally {
      await getAdminClient().from('models').delete().eq('id', modelId);
    }
  });
});
