// Integration test for `saveNarration`. Runs against the local Supabase stack.
// Only the Anthropic SDK boundary and the auth client are mocked so the test
// stays deterministic — every other dependency is the real thing.

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

// --- Mocks --------------------------------------------------------------

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

// Import AFTER mocks are registered (Vitest hoists `vi.mock` but ergonomic
// to keep the convention consistent with the other integration suites).
import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';
import { getAnthropicClientForProfile } from '@/lib/integrations/anthropic';

// --- Fixture ------------------------------------------------------------

interface Fixture {
  owner: TestUser;
  nonOwner: TestUser;
  org: TestOrg;
  session: TestSession;
  modelId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const nonOwner = await createTestUser();
  const org = await createTestOrg({ ownerId: owner.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: owner.id,
    title: 'narration action fixture',
  });
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: owner.id,
      session_id: session.id,
      stage_id: session.stageIds.individual_model,
      title: 'narration action model',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) throw new Error(`model insert failed: ${res.error?.message}`);
  fx = { owner, nonOwner, org, session, modelId: res.data.id as string };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.nonOwner.id);
});

beforeEach(async () => {
  vi.mocked(getAnthropicClientForProfile).mockReset();
  currentClient = await signInAs(fx.owner);
});

// --- Helpers ------------------------------------------------------------

function stubAnthropicClient(cleanedText: string): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text' as const, text: cleanedText }],
      }),
    },
  } as unknown as Anthropic;
}

// --- Tests --------------------------------------------------------------

describe('saveNarration (integration)', () => {
  it('owner save, no Anthropic key → raw stored, cleanupStatus skipped', async () => {
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: false,
      code: 'no_claude_key',
    });

    const res = await saveNarration(fx.modelId, '  spoken words here  ', 3000);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.cleanupStatus).toBe('skipped');
    expect(res.transcript).toBe('spoken words here');
    expect(res.cleaned).toBe(false);

    const row = await getAdminClient()
      .from('model_narrations')
      .select()
      .eq('model_id', fx.modelId)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.transcript_raw).toBe('spoken words here');
    expect(row.data?.cleaned).toBe(false);
  });

  it('owner save, key present + cleanup succeeds → cleaned text stored, succeeded', async () => {
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient('Spoken words here.'),
    });

    const res = await saveNarration(fx.modelId, 'spoken words here', 2500);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.cleaned).toBe(true);
    expect(res.cleanupStatus).toBe('succeeded');
    expect(res.transcript).toBe('Spoken words here.');

    const row = await getAdminClient()
      .from('model_narrations')
      .select()
      .eq('model_id', fx.modelId)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.transcript).toBe('Spoken words here.');
    expect(row.data?.cleaned).toBe(true);
    expect(row.data?.cleanup_status).toBe('succeeded');
  });

  it('empty transcript → empty_transcript error', async () => {
    const res = await saveNarration(fx.modelId, '   ', null);
    expect(res).toEqual({ ok: false, code: 'empty_transcript' });
  });

  it('non-owner → not_owner error', async () => {
    // Override currentClient to authenticate as a different user. The action
    // returns not_owner before ever reaching the Anthropic lookup, so no
    // cleanup mock is needed here.
    currentClient = await signInAs(fx.nonOwner);

    const res = await saveNarration(fx.modelId, 'some transcript', null);
    expect(res).toEqual({ ok: false, code: 'not_owner' });
  });

  it("participant records → the SESSION FACILITATOR's key does the cleanup", async () => {
    // A participant (non-facilitator) owns their own canvas in fx.session, which
    // is facilitated by fx.owner. Only the facilitator has a key.
    const admin = getAdminClient();
    const m = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.nonOwner.id,
        session_id: fx.session.id,
        stage_id: fx.session.stageIds.skill_building,
        title: 'participant model',
        canvas_state: EMPTY_CANVAS_STATE,
      })
      .select('id')
      .single();
    if (m.error || !m.data) throw new Error(`participant model insert failed: ${m.error?.message}`);
    const participantModelId = m.data.id as string;

    // Resolve key by profile id: only the facilitator (fx.owner) has one.
    vi.mocked(getAnthropicClientForProfile).mockImplementation(async (profileId: string) =>
      profileId === fx.owner.id
        ? { ok: true as const, client: stubAnthropicClient('Polished via facilitator key.') }
        : { ok: false as const, code: 'no_claude_key' as const },
    );

    // The recorder is the participant, who has no key of their own.
    currentClient = await signInAs(fx.nonOwner);
    const res = await saveNarration(participantModelId, 'attendee telling their story', 1500);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.cleaned).toBe(true);
    expect(res.cleanupStatus).toBe('succeeded');
    expect(res.transcript).toBe('Polished via facilitator key.');
    // The key looked up must be the facilitator's, never the recorder's.
    expect(vi.mocked(getAnthropicClientForProfile)).toHaveBeenCalledWith(fx.owner.id);
    expect(vi.mocked(getAnthropicClientForProfile)).not.toHaveBeenCalledWith(fx.nonOwner.id);
  });
});
