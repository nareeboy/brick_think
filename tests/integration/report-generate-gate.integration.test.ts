// Integration test for the `generateSessionReport` entitlement gate.
// Proves that with billing enabled, an unsubscribed facilitator gets
// `upgrade_required` BEFORE any expensive Claude/PDF work, while a subscribed
// facilitator is admitted past the gate (and fails later with `no_models` or
// `no_claude_key` since the test session has no models / no Anthropic key —
// the gate itself is what we are testing here).
//
// The env flip (BILLING_ENABLED + STRIPE_SECRET_KEY) is file-scoped, restored
// in afterAll. Vitest isolates test files per worker so the mutation cannot
// bleed into other files.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

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
// isBillingEnabled() reads these at call time; isEntitled() only does a DB
// read (never calls getStripe()), so a dummy STRIPE_SECRET_KEY is safe.

const ENV_KEYS = ['BILLING_ENABLED', 'STRIPE_SECRET_KEY'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.BILLING_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_not_used'; // isEntitled never constructs Stripe
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// --- Mocks ------------------------------------------------------------------

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

// Import AFTER mocks are registered (Vitest hoists `vi.mock` but ergonomic to
// keep the convention consistent with the other integration suites).
import { generateSessionReport } from '@/app/(authed)/app/sessions/report-actions';

// --- Fixture ----------------------------------------------------------------

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  // Session must have status 'completed' — the gate fires only after the
  // auth / facilitator / completed checks pass.
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'report gate fixture',
    status: 'completed',
  });
  fx = { facilitator, org, session };
});

afterAll(async () => {
  if (!fx) return;
  // Remove billing rows first (cascade would handle it, but be explicit).
  await getAdminClient().from('session_purchases').delete().eq('profile_id', fx.facilitator.id);
  await getAdminClient()
    .from('facilitator_subscriptions')
    .delete()
    .eq('profile_id', fx.facilitator.id);
  await cleanupTestUser(fx.facilitator.id);
});

beforeEach(async () => {
  currentClient = await signInAs(fx.facilitator);
});

afterEach(async () => {
  // Drop any billing rows a test inserted so they cannot leak into later
  // tests regardless of execution order.
  await getAdminClient().from('session_purchases').delete().eq('profile_id', fx.facilitator.id);
  await getAdminClient()
    .from('facilitator_subscriptions')
    .delete()
    .eq('profile_id', fx.facilitator.id);
});

// --- Tests ------------------------------------------------------------------

describe('generateSessionReport entitlement gate', () => {
  it('unentitled facilitator → upgrade_required (gate denies before expensive work)', async () => {
    // No facilitator_subscriptions row exists — the facilitator is unentitled.
    const res = await generateSessionReport(fx.session.id);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected !ok');
    expect(res.code).toBe('upgrade_required');
  });

  it('entitled facilitator → NOT upgrade_required (gate admits past the billing check)', async () => {
    // Insert an active+future subscription row for the facilitator.
    const subUpsert = await getAdminClient()
      .from('facilitator_subscriptions')
      .upsert(
        {
          profile_id: fx.facilitator.id,
          stripe_subscription_id: `sub_rptgate_${fx.facilitator.id.slice(0, 8)}`,
          status: 'active',
          tier: 'session_report',
          current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' },
      );
    expect(subUpsert.error).toBeNull();

    const res = await generateSessionReport(fx.session.id);

    // The gate admitted the facilitator. The call then fails downstream at the
    // first post-gate check — the test session has no models, so `collectSession`
    // yields zero stages and the action returns `no_models` (which sits before
    // the Anthropic-key lookup). Asserting the exact code proves the call passed
    // the gate AND reached the model check, not merely that it wasn't denied.
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected !ok');
    expect(res.code).toBe('no_models');
  });

  it('per-session unlock (no subscription) → NOT upgrade_required (gate admits via session_purchases)', async () => {
    // No facilitator_subscriptions row — the only entitlement is a one-time
    // per-session unlock recorded in session_purchases by the service role.
    const purchase = await getAdminClient().from('session_purchases').insert({
      profile_id: fx.facilitator.id,
      session_id: fx.session.id,
      tier: 'session_report',
      status: 'paid',
    });
    expect(purchase.error).toBeNull();

    const res = await generateSessionReport(fx.session.id);

    // Per-session entitlement clears the gate; the call then reaches the model
    // check and returns `no_models` (the test session has no models).
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected !ok');
    expect(res.code).toBe('no_models');
  });
});
