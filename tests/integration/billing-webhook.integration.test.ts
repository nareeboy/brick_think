// Integration coverage for the billing entitlement round-trip and the RLS
// contract on `facilitator_subscriptions`.
//
// Verifies:
//   * An active subscription row inserted by the service role reads back as
//     entitled via the pure `isSubscriptionEntitled` rule.
//   * A canceled subscription reads back as not entitled.
//   * RLS: an authenticated user may SELECT only their own row.
//   * RLS: a different authenticated user cannot see another user's row.
//   * RLS: no authenticated client may INSERT a subscription row.
//
// Note: the local test stack runs with billing DISABLED (BILLING_ENABLED is
// not set in .env.test), so `isEntitled()` short-circuits to `true` and cannot
// exercise the DB-read path. This suite tests the DB layer + pure entitlement
// rule + RLS directly instead.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import { isSubscriptionEntitled } from '@/lib/billing/entitlements';

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

  it('active subscription within period reads back as entitled', async () => {
    const future = new Date(Date.now() + 30 * 86400_000).toISOString();
    const up = await admin.from('facilitator_subscriptions').upsert(
      {
        profile_id: owner.id,
        stripe_subscription_id: `sub_test_${owner.id.slice(0, 8)}`,
        status: 'active',
        current_period_end: future,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
    expect(up.error).toBeNull();

    const { data } = await admin
      .from('facilitator_subscriptions')
      .select('status, current_period_end')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(isSubscriptionEntitled(data, new Date())).toBe(true);
  });

  it('canceled subscription reads back as not entitled', async () => {
    await admin
      .from('facilitator_subscriptions')
      .update({ status: 'canceled' })
      .eq('profile_id', owner.id);
    const { data } = await admin
      .from('facilitator_subscriptions')
      .select('status, current_period_end')
      .eq('profile_id', owner.id)
      .maybeSingle();
    expect(isSubscriptionEntitled(data, new Date())).toBe(false);
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
