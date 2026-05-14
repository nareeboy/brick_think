// purge_dead_share_links() — closes
//   docs/superpowers/followups/2026-05-13-public-sharing-links-followups.md  #5
//
// Tests the function body, not the pg_cron scheduler (which fires daily at
// 03:43 UTC and can't be exercised in unit time).

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  owner: TestUser;
  modelId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const admin = getAdminClient();
  const modelRes = await admin
    .from('models')
    .insert({
      owner_profile_id: owner.id,
      title: 'share-gc-fixture',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (modelRes.error || !modelRes.data) {
    throw new Error(`fixture insert failed: ${modelRes.error?.message}`);
  }
  fx = { owner, modelId: modelRes.data.id as string };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
});

async function seedLink(opts: {
  revokedAt?: Date | null;
  expiresAt?: Date | null;
  token?: string;
}): Promise<string> {
  const admin = getAdminClient();
  // Token must be 32–128 chars per the check constraint.
  const token =
    opts.token ?? `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const res = await admin
    .from('model_share_links')
    .insert({
      model_id: fx.modelId,
      created_by: fx.owner.id,
      token,
      revoked_at: opts.revokedAt?.toISOString() ?? null,
      expires_at: opts.expiresAt?.toISOString() ?? null,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedLink failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

describe('purge_dead_share_links()', () => {
  test('removes rows revoked or expired more than 90 days ago, leaves the rest', async () => {
    const admin = getAdminClient();
    const day = 24 * 60 * 60 * 1000;

    const oldRevoked = await seedLink({
      revokedAt: new Date(Date.now() - 91 * day),
    });
    const recentRevoked = await seedLink({
      revokedAt: new Date(Date.now() - 30 * day),
    });
    const oldExpired = await seedLink({
      expiresAt: new Date(Date.now() - 91 * day),
    });
    const recentExpired = await seedLink({
      expiresAt: new Date(Date.now() - 1 * day),
    });
    const stillLive = await seedLink({
      expiresAt: new Date(Date.now() + 7 * day),
    });
    const neverExpires = await seedLink({});

    const rpcRes = await admin.rpc('purge_dead_share_links');
    expect(rpcRes.error).toBeNull();

    async function exists(id: string): Promise<boolean> {
      const r = await admin
        .from('model_share_links')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      return r.data !== null;
    }

    expect(await exists(oldRevoked)).toBe(false);
    expect(await exists(oldExpired)).toBe(false);
    expect(await exists(recentRevoked)).toBe(true);
    expect(await exists(recentExpired)).toBe(true);
    expect(await exists(stillLive)).toBe(true);
    expect(await exists(neverExpires)).toBe(true);

    // Cleanup the survivors so the fixture stays tidy.
    await admin
      .from('model_share_links')
      .delete()
      .in('id', [recentRevoked, recentExpired, stillLive, neverExpires]);
  });
});
