// Integration tests for white-label branding gating in generateSessionReport.
//
// Verifies three behaviours against the real local Supabase stack:
//   1. session_report tier ignores any brandProfileId → renders with null branding
//   2. client_ready tier resolves + applies branding AND persists the choice on
//      sessions.brand_profile_id
//   3. client_ready tier with another user's preset → resolveBranding returns null
//
// Mocking strategy mirrors facilitatorNotes.integration.test.ts: next/cache and
// @/lib/db/server are mocked; the user-scoped client is swapped per test via
// signInAs. We additionally mock the report pipeline (collect/synthesize/pdf/
// anthropic/canvas-image) so the run is fast and so we can capture the branding
// argument handed to the renderer. We deliberately DO NOT mock
// @/lib/branding/resolve or @/lib/db/service — those hit the local stack so the
// branding resolution + session update are genuinely exercised.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import type * as Entitlements from '@/lib/billing/entitlements';

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

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

// Keep entitledTier mockable but hasTierRank (and everything else) real.
vi.mock('@/lib/billing/entitlements', async (orig) => ({
  ...(await orig<typeof Entitlements>()),
  entitledTier: vi.fn(),
}));

vi.mock('@/lib/reports/pdf', () => ({
  renderSessionReportPdf: vi.fn(async () => Buffer.from('%PDF-1.4 test')),
}));

vi.mock('@/lib/reports/synthesize', () => ({
  synthesizeReport: vi.fn(async () => ({ execSummary: 's', closing: 'c', modelDescriptions: {} })),
}));

vi.mock('@/lib/integrations/anthropic', () => ({
  getServerAnthropicClient: vi.fn(() => ({ ok: true, client: {} })),
}));

vi.mock('@/lib/reports/canvas-image', () => ({
  getCanvasImageBuffer: vi.fn(async () => null),
}));

// collectSession is mocked with a minimal-but-typed fixture; orderedStages real
// shape returns the single stage we provide a model for.
const MODEL_ID = crypto.randomUUID();
let collectOrgId = '';
vi.mock('@/lib/reports/collect', () => ({
  collectSession: vi.fn(async () => ({
    sessionId: 'fixture',
    sessionTitle: 'T',
    orgId: collectOrgId,
    orgName: 'O',
    facilitatorName: 'F',
    date: '2026-06-09',
    participantCount: 1,
    modelsByStage: new Map([
      [
        'shared_model',
        [
          {
            id: MODEL_ID,
            stageType: 'shared_model',
            title: 'M',
            canvasState: { groups: [], bricks: [] },
            thumbnailUrl: null,
            ownerLabel: 'me',
            extractedText: '',
            narration: null,
          },
        ],
      ],
    ]),
  })),
  orderedStages: vi.fn(() => ['shared_model']),
}));

import { generateSessionReport } from '@/app/(authed)/app/sessions/report-actions';
import { entitledTier } from '@/lib/billing/entitlements';
import { renderSessionReportPdf } from '@/lib/reports/pdf';

interface Fixture {
  alice: TestUser;
  bob: TestUser;
  org: TestOrg;
  session: TestSession;
  aliceBrandId: string;
  bobBrandId: string;
}

let fx: Fixture;

const CURATED_FONT = { kind: 'curated', key: 'fraunces' };

async function seedBrandProfile(ownerId: string, displayName: string): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('brand_profiles')
    .insert({
      owner_id: ownerId,
      name: displayName,
      display_name: displayName,
      footer_contact: null,
      brand_colour: '#112233',
      accent_colour: '#445566',
      logo_path: null,
      heading_font: CURATED_FONT,
      body_font: CURATED_FONT,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedBrandProfile failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

beforeEach(async () => {
  const alice = await createTestUser();
  const bob = await createTestUser();
  const org = await createTestOrg({ ownerId: alice.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: alice.id,
    status: 'completed',
  });
  collectOrgId = org.id;
  const aliceBrandId = await seedBrandProfile(alice.id, 'Acme Consulting');
  const bobBrandId = await seedBrandProfile(bob.id, 'Bob Co');

  fx = { alice, bob, org, session, aliceBrandId, bobBrandId };
});

afterEach(async () => {
  if (fx) {
    await cleanupTestUser(fx.alice.id);
    await cleanupTestUser(fx.bob.id);
  }
  vi.clearAllMocks();
});

function lastBrandingArg(): unknown {
  const calls = vi.mocked(renderSessionReportPdf).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[0]![1];
}

describe('generateSessionReport white-label gating', () => {
  test('session_report tier ignores branding (renders with null)', async () => {
    currentClient = await signInAs(fx.alice);
    vi.mocked(entitledTier).mockResolvedValue('session_report');

    const res = await generateSessionReport(fx.session.id, fx.aliceBrandId);
    expect(res.ok).toBe(true);
    expect(lastBrandingArg()).toBeNull();
  });

  test('client_ready tier applies branding and persists the choice', async () => {
    currentClient = await signInAs(fx.alice);
    vi.mocked(entitledTier).mockResolvedValue('client_ready');

    const res = await generateSessionReport(fx.session.id, fx.aliceBrandId);
    expect(res.ok).toBe(true);

    const branding = lastBrandingArg() as { displayName: string } | null;
    expect(branding).not.toBeNull();
    expect(branding?.displayName).toBe('Acme Consulting');

    const admin = getAdminClient();
    const row = await admin
      .from('sessions')
      .select('brand_profile_id')
      .eq('id', fx.session.id)
      .single();
    expect(row.data?.brand_profile_id).toBe(fx.aliceBrandId);
  });

  test("client_ready tier with another user's preset resolves to null branding", async () => {
    currentClient = await signInAs(fx.alice);
    vi.mocked(entitledTier).mockResolvedValue('client_ready');

    const res = await generateSessionReport(fx.session.id, fx.bobBrandId);
    expect(res.ok).toBe(true);
    expect(lastBrandingArg()).toBeNull();

    // The cross-owner id must NOT be persisted: branding never resolved, so the
    // session's brand_profile_id stays null (it was seeded without one).
    const admin = getAdminClient();
    const { data: row } = await admin
      .from('sessions')
      .select('brand_profile_id')
      .eq('id', fx.session.id)
      .single();
    expect(row?.brand_profile_id).toBeNull();
  });
});
