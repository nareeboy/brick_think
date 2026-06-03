// Integration test for `generateSessionReport`. Runs against the local Supabase
// stack with the real `lib/reports/*` pipeline (collect, synthesize, PDF render,
// Storage upload, signed-URL mint). Only the Anthropic SDK boundary is mocked
// so the test stays deterministic — every other dependency is the real thing.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';

import type { CanvasState } from '@/lib/models/types';
import { encryptApiKey } from '@/lib/integrations/crypto';
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

// Mock ONLY the Anthropic boundary. Everything downstream (PDF render,
// Storage upload, session_reports upsert) runs against the real local stack.
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
import { generateSessionReport } from '@/app/(authed)/app/sessions/report-actions';
import { getAnthropicClientForProfile } from '@/lib/integrations/anthropic';

// --- Helpers ------------------------------------------------------------

const POPULATED_CANVAS: CanvasState = {
  groups: [{ id: 'g_seed', name: 'Build', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b_seed',
      groupId: 'g_seed',
      code: 'red-2x2',
      image: '/bricks/red-2x2.png',
      width: 64,
      height: 64,
      x: 0,
      y: 0,
      rotation: 0,
      visible: true,
    },
  ],
};

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  fx = { facilitator, org };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
});

beforeEach(async () => {
  // Required by `encryptApiKey` when seeding user_integrations rows. 64 hex
  // chars = 32-byte key (AES-256-GCM).
  process.env.BRICKTHINK_ENCRYPTION_KEY = '00'.repeat(32);
  vi.mocked(getAnthropicClientForProfile).mockReset();
  currentClient = await signInAs(fx.facilitator);
});

async function makeSession(args: { status: 'draft' | 'live' | 'completed' }): Promise<TestSession> {
  return createTestSession({
    orgId: fx.org.id,
    facilitatorId: fx.facilitator.id,
    title: `report fixture ${crypto.randomUUID().slice(0, 6)}`,
    status: args.status,
  });
}

async function insertModel(args: {
  session: TestSession;
  stageType:
    | 'individual_model'
    | 'shared_model'
    | 'system_model'
    | 'guiding_principles'
    | 'skill_building';
  title: string;
  canvas?: CanvasState;
}): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: fx.facilitator.id,
      session_id: args.session.id,
      stage_id: args.session.stageIds[args.stageType],
      title: args.title,
      canvas_state: args.canvas ?? POPULATED_CANVAS,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`insertModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

async function seedUserIntegration(): Promise<void> {
  const { ciphertext, nonce, last4 } = encryptApiKey('sk-ant-test-key-not-a-secret');
  const admin = getAdminClient();
  const res = await admin.from('user_integrations').upsert(
    {
      profile_id: fx.facilitator.id,
      anthropic_api_key_ciphertext: ciphertext.toString('base64'),
      anthropic_api_key_nonce: nonce.toString('base64'),
      anthropic_api_key_last4: last4,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );
  if (res.error) throw new Error(`seedUserIntegration failed: ${res.error.message}`);
}

async function clearUserIntegration(): Promise<void> {
  const admin = getAdminClient();
  await admin.from('user_integrations').delete().eq('profile_id', fx.facilitator.id);
}

async function clearStorageForOrg(): Promise<void> {
  const admin = getAdminClient();
  // List + remove anything in this org's prefix from prior tests in the file.
  const prefix = `${fx.org.id}`;
  const { data } = await admin.storage.from('session-reports').list(prefix, {
    limit: 1000,
  });
  if (!data || data.length === 0) return;
  for (const folder of data) {
    const sub = await admin.storage
      .from('session-reports')
      .list(`${prefix}/${folder.name}`, { limit: 1000 });
    if (sub.data && sub.data.length > 0) {
      await admin.storage
        .from('session-reports')
        .remove(sub.data.map((f) => `${prefix}/${folder.name}/${f.name}`));
    }
  }
}

function stubAnthropicClient(): Anthropic {
  return {
    messages: {
      create: async () => ({
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              exec_summary: 'Summary para.\n\nSecond para.',
              model_descriptions: {},
              closing: 'Closing para.\n\nNext step: keep going.',
            }),
          },
        ],
      }),
    },
  } as unknown as Anthropic;
}

async function readReportRow(sessionId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('session_reports')
    .select('generation_status, pdf_path, error_code, included_artifacts')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw new Error(`readReportRow: ${error.message}`);
  return data;
}

// --- Tests --------------------------------------------------------------

describe('generateSessionReport (integration)', () => {
  it('refuses when session is not completed', async () => {
    const session = await makeSession({ status: 'live' });
    await insertModel({ session, stageType: 'individual_model', title: 'M1' });
    // Anthropic mock is irrelevant — the status guard runs first.
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient(),
    });

    const res = await generateSessionReport(session.id);
    expect(res).toEqual({ ok: false, code: 'session_not_completed' });
  });

  it('refuses when facilitator has no Claude key', async () => {
    await clearUserIntegration();
    const session = await makeSession({ status: 'completed' });
    await insertModel({ session, stageType: 'individual_model', title: 'M1' });
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: false,
      code: 'no_claude_key',
    });

    const res = await generateSessionReport(session.id);
    expect(res).toEqual({ ok: false, code: 'no_claude_key' });
  });

  it('refuses when the completed session has no models', async () => {
    const session = await makeSession({ status: 'completed' });
    await seedUserIntegration();
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient(),
    });

    const res = await generateSessionReport(session.id);
    expect(res).toEqual({ ok: false, code: 'no_models' });
  });

  it('writes a succeeded report row and uploads a PDF', async () => {
    await clearStorageForOrg();
    const session = await makeSession({ status: 'completed' });
    // Two models on different stages — the unique-per-(session, stage, owner)
    // index forbids two models on the same stage for the same facilitator.
    const m1 = await insertModel({
      session,
      stageType: 'individual_model',
      title: 'Alice model',
    });
    const m2 = await insertModel({
      session,
      stageType: 'shared_model',
      title: 'Bob model',
    });
    await seedUserIntegration();
    vi.mocked(getAnthropicClientForProfile).mockResolvedValue({
      ok: true,
      client: stubAnthropicClient(),
    });

    const res = await generateSessionReport(session.id);

    if (!res.ok) {
      throw new Error(`expected ok=true, got ${JSON.stringify(res)}`);
    }
    expect(res.pdfUrl).toMatch(/^http/);
    expect(typeof res.generatedAt).toBe('string');

    const row = await readReportRow(session.id);
    expect(row?.generation_status).toBe('succeeded');
    expect(row?.pdf_path).toMatch(new RegExp(`^${fx.org.id}/${session.id}/\\d+\\.pdf$`));
    const artifacts = row?.included_artifacts as { models: string[] };
    expect([...artifacts.models].sort()).toEqual([m1, m2].sort());
  });
});
