// Integration test for `saveNarration`. Runs against the local Supabase stack.
// On the open core the premium hook (`cleanupNarration`) is a no-op stub, so
// every save yields cleaned=false / cleanup_status='skipped' regardless of
// the facilitator's subscription tier. Only the auth client is mocked so the
// test stays deterministic — every other dependency is the real thing.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

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

// Import AFTER mocks are registered (Vitest hoists `vi.mock` but ergonomic
// to keep the convention consistent with the other integration suites).
import { saveNarration } from '@/app/(authed)/app/designs/narration-actions';

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
  currentClient = await signInAs(fx.owner);
});

// --- Tests --------------------------------------------------------------

describe('saveNarration (integration)', () => {
  it('owner save → raw stored, cleanupStatus skipped (open-core stub pass-through)', async () => {
    // On the open core cleanupNarration is a no-op stub, so even when the
    // facilitator has an active subscription the hook returns skip.
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
    expect(row.data?.transcript).toBe('spoken words here');
    expect(row.data?.cleaned).toBe(false);
    expect(row.data?.cleanup_status).toBe('skipped');
  });

  it('empty transcript → empty_transcript error', async () => {
    const res = await saveNarration(fx.modelId, '   ', null);
    expect(res).toEqual({ ok: false, code: 'empty_transcript' });
  });

  it('non-owner → not_owner error', async () => {
    // Override currentClient to authenticate as a different user. The action
    // returns not_owner before ever reaching the cleanup hook.
    currentClient = await signInAs(fx.nonOwner);

    const res = await saveNarration(fx.modelId, 'some transcript', null);
    expect(res).toEqual({ ok: false, code: 'not_owner' });
  });

  it('a participant recording in a facilitated session → stub pass-through', async () => {
    // A participant (non-facilitator) owns their own canvas in fx.session.
    // Even with the facilitator's session context, the stub hook returns skip.
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

    currentClient = await signInAs(fx.nonOwner);
    const res = await saveNarration(participantModelId, 'attendee telling their story', 1500);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    // Open-core stub: no cleanup ever runs.
    expect(res.cleaned).toBe(false);
    expect(res.cleanupStatus).toBe('skipped');
    expect(res.transcript).toBe('attendee telling their story');
  });
});
