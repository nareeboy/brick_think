// Integration coverage for the billing entitlement round-trip and the RLS
// contract on `facilitator_subscriptions`.
//
// Verifies:
//   * An active subscription row inserted by the service role resolves to its
//     tier via the pure `subscriptionTierFromRow` rule.
//   * A canceled subscription resolves to null (no tier).
//   * `tierForPriceId` maps a configured Stripe price id to its {tier, mode}.
//   * RLS: an authenticated user may SELECT only their own row.
//   * RLS: a different authenticated user cannot see another user's row.
//   * RLS: no authenticated client may INSERT a subscription row.
//
// Note: the local test stack runs with billing DISABLED (BILLING_ENABLED is
// not set in .env.test), so `isEntitled()` short-circuits and cannot exercise
// the DB-read path. This suite tests the DB layer + pure entitlement rule +
// RLS directly instead.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import { subscriptionTierFromRow } from '@/lib/billing/entitlements';
import { tierForPriceId } from '@/lib/billing/plans';

describe('billing: facilitator_subscriptions entitlement + RLS', () => {
  const admin = getAdminClient();
  let owner: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    owner = await createTestUser();
    other = await createTestUser();
  });

  afterAll(async () => {
    await admin.from('facilitator_subscriptions').delete().eq('profile_id', owner.id);
    await admin.from('stripe_customers').delete().eq('profile_id', owner.id);
    await cleanupTestUser(owner.id);
    await cleanupTestUser(other.id);
  });

  it('active subscription within period resolves to its tier', async () => {
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    const up = await admin.from('facilitator_subscriptions').upsert(
      {
        profile_id: owner.id,
        stripe_subscription_id: `sub_test_${owner.id.slice(0, 8)}`,
        status: 'active',
        tier: 'client_ready',
        current_period_end: future,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
    expect(up.error).toBeNull();

    const { data } = await admin
      .from('facilitator_subscriptions')
      .select('status, current_period_end, tier')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(subscriptionTierFromRow(data, new Date())).toBe('client_ready');
  });

  it('canceled subscription resolves to null', async () => {
    await admin
      .from('facilitator_subscriptions')
      .update({ status: 'canceled' })
      .eq('profile_id', owner.id);
    const { data } = await admin
      .from('facilitator_subscriptions')
      .select('status, current_period_end, tier')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(subscriptionTierFromRow(data, new Date())).toBeNull();
  });

  it('tierForPriceId maps a configured price id to its tier', () => {
    const ENV_KEY = 'STRIPE_PRICE_CLIENT_READY_MONTHLY';
    const saved = process.env[ENV_KEY];
    try {
      process.env[ENV_KEY] = 'price_test_cr_monthly';
      expect(tierForPriceId('price_test_cr_monthly')).toEqual({
        tier: 'client_ready',
        mode: 'monthly',
      });
      expect(tierForPriceId('price_unknown')).toBeNull();
    } finally {
      if (saved === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = saved;
    }
  });

  it('RLS: owner can read their own subscription row', async () => {
    // ensure a row exists (re-activate)
    await admin
      .from('facilitator_subscriptions')
      .update({ status: 'active' })
      .eq('profile_id', owner.id);
    const ownerClient = await signInAs(owner);
    const { data, error } = await ownerClient
      .from('facilitator_subscriptions')
      .select('status')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.status).toBe('active');
  });

  it("RLS: a different user cannot read the owner's subscription row", async () => {
    const otherClient = await signInAs(other);
    const { data } = await otherClient
      .from('facilitator_subscriptions')
      .select('status')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(data).toBeNull(); // RLS filters it out → no row visible
  });

  it('RLS: no client may write a subscription row', async () => {
    const ownerClient = await signInAs(owner);
    const res = await ownerClient.from('facilitator_subscriptions').insert({
      profile_id: other.id,
      stripe_subscription_id: 'sub_should_fail',
      status: 'active',
      current_period_end: null,
      updated_at: new Date().toISOString(),
    });
    expect(res.error).not.toBeNull(); // no INSERT policy for authenticated → denied
  });
});
