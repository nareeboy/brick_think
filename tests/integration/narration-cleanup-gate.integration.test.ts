// Integration test for the narration-cleanup entitlement gate.
// Proves that with billing enabled, an unsubscribed facilitator gets cleanup
// SKIPPED (raw transcript preserved, no Claude call) while a subscribed
// facilitator gets cleanup run.
//
// The env flip (BILLING_ENABLED + STRIPE_SECRET_KEY) is restored in afterAll.
// Vitest isolates test files per worker, so the in-file env mutation cannot
// bleed into other files.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
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

import type * as AnthropicModule from '@/lib/integrations/anthropic';

vi.mock('@/lib/integrations/anthropic', async (orig) => {
  const actual = (await orig()) as typeof AnthropicModule;
  return {
    ...actual,
    getAnthropicClientForProfile: vi.fn(),
  };
});

// Import AFTER mocks are registered.
import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';
import { getAnthropicClientForProfile } from '@/lib/integrations/anthropic';

// --- Fixture ----------------------------------------------------------------

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
  session: TestSession;
  modelId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'cleanup gate fixture',
  });
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: facilitator.id,
      session_id: session.id,
      stage_id: session.stageIds.individual_model,
      title: 'cleanup gate model',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) throw new Error(`model insert failed: ${res.error?.message}`);
  fx = { facilitator, org, session, modelId: res.data.id as string };
});

afterAll(async () => {
  if (!fx) return;
  // Remove subscription row first (cascade would handle it, but be explicit).
  await getAdminClient()
    .from('facilitator_subscriptions')
    .delete()
    .eq('profile_id', fx.facilitator.id);
  await cleanupTestUser(fx.facilitator.id);
});

beforeEach(async () => {
  vi.mocked(getAnthropicClientForProfile).mockReset();
  currentClient = await signInAs(fx.facilitator);
});

// --- Helpers ----------------------------------------------------------------

function stubAnthropicClient(cleanedText: string): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text' as const, text: cleanedText }],
      }),
    },
  } as unknown as Anthropic;
}

// --- Tests ------------------------------------------------------------------

describe('saveNarration cleanup gate (billing enabled)', () => {
  it('unentitled facilitator → cleanup skipped (gate blocks)', async () => {
    // No facilitator_subscriptions row exists for the facilitator by default.
    // The Anthropic mock is a SUCCEEDING client — to PROVE the gate, not the
    // key, is what skips cleanup.
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient('Polished text.'),
    });

    const res = await saveNarration(fx.modelId, '  raw spoken words  ', 3000);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.cleanupStatus).toBe('skipped');
    expect(res.cleaned).toBe(false);
    // Trimmed raw, NOT polished.
    expect(res.transcript).toBe('raw spoken words');

    // The gate short-circuits before the key lookup.
    expect(vi.mocked(getAnthropicClientForProfile)).not.toHaveBeenCalled();

    // DB row must reflect raw text + cleaned=false.
    const row = await getAdminClient()
      .from('model_narrations')
      .select()
      .eq('model_id', fx.modelId)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.transcript_raw).toBe('raw spoken words');
    expect(row.data?.cleaned).toBe(false);
  });

  it('entitled facilitator → cleanup runs', async () => {
    // Insert an active subscription row for the facilitator via the admin client.
    await getAdminClient()
      .from('facilitator_subscriptions')
      .upsert(
        {
          profile_id: fx.facilitator.id,
          stripe_subscription_id: `sub_gate_${fx.facilitator.id.slice(0, 8)}`,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' },
      );

    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient('Polished text.'),
    });

    const res = await saveNarration(fx.modelId, 'raw spoken words', 2500);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.cleaned).toBe(true);
    expect(res.cleanupStatus).toBe('succeeded');
    expect(res.transcript).toBe('Polished text.');
    expect(vi.mocked(getAnthropicClientForProfile)).toHaveBeenCalledWith(fx.facilitator.id);
  });
});
