// Integration coverage for per-session entitlement resolution + the RLS
// contract on `session_purchases`.
//
// `entitledTier` = max(subscriptionTier, sessionPurchaseTier). With billing
// ENABLED it does real service-role DB reads, so this suite drives it directly
// (no createServerSupabaseClient mock needed — entitledTier uses the service
// role internally). Verifies:
//   * No subscription + no purchase → entitledTier(fac, sessionA) is null.
//   * A per-session purchase unlocks only that session (sessionA), not another
//     (sessionB) — per-session isolation.
//   * An active+future subscription covers all sessions and wins as the max.
//   * RLS: the buyer may SELECT their own session_purchases row; a different
//     authenticated user cannot see it.
//
// The env flip (BILLING_ENABLED + dummy STRIPE_SECRET_KEY) is file-scoped and
// restored in afterAll; Vitest isolates files per worker so it cannot bleed.

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

// --- Env flip (billing ON) --------------------------------------------------
// isBillingEnabled() reads these at call time; entitledTier only does DB reads
// (never constructs Stripe), so a dummy STRIPE_SECRET_KEY is safe.

const ENV_KEYS = ['BILLING_ENABLED', 'STRIPE_SECRET_KEY'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.BILLING_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_not_used';
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// Import AFTER the env flip is registered so the module sees billing ON.
import { entitledTier } from '@/lib/billing/entitlements';

// --- Fixture ----------------------------------------------------------------

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
  sessionA: TestSession;
  sessionB: TestSession;
}

let fx: Fixture;

async function clearBilling(facilitatorId: string): Promise<void> {
  const admin = getAdminClient();
  await admin.from('session_purchases').delete().eq('profile_id', facilitatorId);
  await admin.from('facilitator_subscriptions').delete().eq('profile_id', facilitatorId);
}

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  const sessionA = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'session-purchase fixture A',
    status: 'completed',
  });
  const sessionB = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'session-purchase fixture B',
    status: 'completed',
  });
  fx = { facilitator, org, sessionA, sessionB };
});

afterAll(async () => {
  if (!fx) return;
  await clearBilling(fx.facilitator.id);
  await cleanupTestUser(fx.facilitator.id);
});

afterEach(async () => {
  // Drop billing rows so tests stay order-independent.
  await clearBilling(fx.facilitator.id);
});

// --- Tests ------------------------------------------------------------------

describe('session_purchases entitlement + RLS', () => {
  it('no subscription, no purchase → entitledTier(fac, sessionA) is null', async () => {
    const tier = await entitledTier(fx.facilitator.id, fx.sessionA.id);
    expect(tier).toBeNull();
  });

  it('a per-session purchase unlocks only that session (per-session isolation)', async () => {
    const purchase = await getAdminClient().from('session_purchases').insert({
      profile_id: fx.facilitator.id,
      session_id: fx.sessionA.id,
      tier: 'session_report',
      status: 'paid',
    });
    expect(purchase.error).toBeNull();

    expect(await entitledTier(fx.facilitator.id, fx.sessionA.id)).toBe('session_report');
    // sessionB has no purchase and there is no subscription → still null.
    expect(await entitledTier(fx.facilitator.id, fx.sessionB.id)).toBeNull();
  });

  it('an active+future subscription covers all sessions and wins as the max', async () => {
    const sub = await getAdminClient()
      .from('facilitator_subscriptions')
      .upsert(
        {
          profile_id: fx.facilitator.id,
          stripe_subscription_id: `sub_sesspurch_${fx.facilitator.id.slice(0, 8)}`,
          status: 'active',
          tier: 'client_ready',
          current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' },
      );
    expect(sub.error).toBeNull();

    // Subscription covers every session (max of client_ready vs any per-session).
    expect(await entitledTier(fx.facilitator.id, fx.sessionA.id)).toBe('client_ready');
    // With no sessionId the per-session row is never consulted — still the sub.
    expect(await entitledTier(fx.facilitator.id)).toBe('client_ready');
  });

  it('RLS: buyer may read their own purchase row; a different user cannot', async () => {
    const insert = await getAdminClient().from('session_purchases').insert({
      profile_id: fx.facilitator.id,
      session_id: fx.sessionA.id,
      tier: 'session_report',
      status: 'paid',
    });
    expect(insert.error).toBeNull();

    // Buyer (profile_id = auth.uid()) can see their row.
    const buyerClient = await signInAs(fx.facilitator);
    const buyerRead = await buyerClient
      .from('session_purchases')
      .select('tier, status')
      .eq('profile_id', fx.facilitator.id)
      .eq('session_id', fx.sessionA.id)
      .maybeSingle();
    expect(buyerRead.error).toBeNull();
    expect(buyerRead.data?.tier).toBe('session_report');

    // A different authenticated user sees nothing (RLS filters it out).
    const other = await createTestUser();
    try {
      const otherClient = await signInAs(other);
      const otherRead = await otherClient
        .from('session_purchases')
        .select('tier, status')
        .eq('profile_id', fx.facilitator.id)
        .eq('session_id', fx.sessionA.id)
        .maybeSingle();
      expect(otherRead.data).toBeNull();
    } finally {
      await cleanupTestUser(other.id);
    }
  });
});
