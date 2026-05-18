// Integration tests for stage-controller-actions — 6 verbs, all facilitator-only.
//
// Pattern follows account-actions.integration.test.ts:
//   - vi.mock('next/cache') + vi.mock('@/lib/db/server') before the action import
//   - getServiceSupabaseClient() is NOT mocked — it works against the real local stack
//   - Per-test fixture via createTestUser / createTestOrg / createTestSession / addOrgMember
//   - getAdminClient() for post-action DB verification (bypasses RLS)

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  addOrgMember,
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
import { CANONICAL_STAGE_TYPES } from '@/lib/sessions/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── vi.mock calls MUST come before the import of any module that uses them ──

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    throw new Error(`__redirect__:${url ?? ''}`);
  },
}));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

// Import AFTER mocks are registered.
import {
  startStageAction,
  pauseStageAction,
  resumeStageAction,
  extendStageAction,
  advanceStageAction,
  rollbackStageAction,
} from '@/app/(authed)/app/sessions/stage-controller-actions';

// ── Fixture types ─────────────────────────────────────────────────────────────

interface Fixture {
  facilitator: TestUser;
  /** Member of the same org, but not the facilitator. */
  participant: TestUser;
  /** Completely outside the org — RLS hides the stage row. */
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const outsider = await createTestUser();

  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });

  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Stage-controller integration fixture',
  });

  fx = { facilitator, participant, outsider, org, session };
});

afterAll(async () => {
  if (!fx) return;
  // Cleanup order: sessions cascade-delete stages; then orgs; then users.
  const admin = getAdminClient();
  await admin.from('sessions').delete().eq('facilitator_id', fx.facilitator.id);
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
  await cleanupTestUser(fx.outsider.id);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * noUncheckedIndexedAccess is enabled — array[n] returns T|undefined.
 * This assertion narrows the type and gives a clear error if a test
 * accidentally goes out of bounds.
 */
function mustGet<T>(arr: readonly T[], idx: number, label?: string): T {
  const v = arr[idx];
  if (v === undefined) throw new Error(`mustGet: index ${idx} out of bounds${label ? ` (${label})` : ''}`);
  return v;
}

/**
 * Return stage IDs in position order (matches CANONICAL_STAGE_TYPES order from
 * createTestSession).
 */
function stagesByPosition(session: TestSession): string[] {
  return CANONICAL_STAGE_TYPES.map((t) => {
    const id = session.stageIds[t];
    if (!id) throw new Error(`Stage id not found for type ${t}`);
    return id;
  });
}

async function freshSession(): Promise<{ session: TestSession; stages: string[] }> {
  const session = await createTestSession({
    orgId: fx.org.id,
    facilitatorId: fx.facilitator.id,
    title: `Fixture ${crypto.randomUUID().slice(0, 8)}`,
  });
  return { session, stages: stagesByPosition(session) };
}

async function getStageRow(stageId: string) {
  const admin = getAdminClient();
  const res = await admin
    .from('stages')
    .select('id, status, started_at, ended_at, paused_at, total_paused_ms, extended_seconds')
    .eq('id', stageId)
    .single();
  if (res.error || !res.data) throw new Error(`getStageRow failed: ${res.error?.message}`);
  return res.data;
}

async function getSessionRow(sessionId: string) {
  const admin = getAdminClient();
  const res = await admin
    .from('sessions')
    .select('id, current_stage_id, status')
    .eq('id', sessionId)
    .single();
  if (res.error || !res.data) throw new Error(`getSessionRow failed: ${res.error?.message}`);
  return res.data;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('stage-controller-actions (integration)', () => {
  // ── UUID validation ──────────────────────────────────────────────────────
  test('returns invalid_uuid for a garbage stageId', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await startStageAction('not-a-uuid');
    expect(result).toEqual({ ok: false, code: 'invalid_uuid' });
  });

  // ── start → pause → resume round-trip ────────────────────────────────────
  test('start → pause → resume updates status and paused-time fields', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { session, stages } = await freshSession();
    const stageId = mustGet(stages, 0, 'stage 0');

    // Start
    expect(await startStageAction(stageId)).toEqual({ ok: true });

    const afterStart = await getStageRow(stageId);
    expect(afterStart.status).toBe('active');
    expect(afterStart.started_at).not.toBeNull();
    expect(afterStart.paused_at).toBeNull();

    // Session pointer should now be this stage; session promoted to live
    const sess = await getSessionRow(session.id);
    expect(sess.current_stage_id).toBe(stageId);
    expect(sess.status).toBe('live');

    // Pause
    const t0 = Date.now();
    expect(await pauseStageAction(stageId)).toEqual({ ok: true });

    const afterPause = await getStageRow(stageId);
    expect(afterPause.status).toBe('paused');
    expect(afterPause.paused_at).not.toBeNull();

    // Small wait so paused_for_ms is measurably > 0
    await new Promise((r) => setTimeout(r, 50));

    // Resume
    expect(await resumeStageAction(stageId)).toEqual({ ok: true });

    const afterResume = await getStageRow(stageId);
    expect(afterResume.status).toBe('active');
    expect(afterResume.paused_at).toBeNull();
    const elapsed = Date.now() - t0;
    expect(afterResume.total_paused_ms).toBeGreaterThan(0);
    expect(afterResume.total_paused_ms).toBeLessThan(elapsed + 5_000); // generous upper bound
  });

  // ── pause from pending → invalid_transition ───────────────────────────────
  test('pause from pending returns invalid_transition', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    const result = await pauseStageAction(mustGet(stages, 0));
    expect(result).toMatchObject({ ok: false, code: 'invalid_transition', verb: 'pause' });
  });

  // ── resume from active → invalid_transition ───────────────────────────────
  test('resume from active (not paused) returns invalid_transition', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    await startStageAction(s0);
    const result = await resumeStageAction(s0);
    expect(result).toMatchObject({ ok: false, code: 'invalid_transition', verb: 'resume' });
  });

  // ── extend bumps extended_seconds ─────────────────────────────────────────
  test('extend twice accumulates extended_seconds', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    await startStageAction(s0);

    expect(await extendStageAction(s0, 60)).toEqual({ ok: true });
    expect(await extendStageAction(s0, 60)).toEqual({ ok: true });

    const row = await getStageRow(s0);
    expect(row.extended_seconds).toBe(120);
  });

  // ── extend rejects invalid amounts ────────────────────────────────────────
  test('extend rejects zero, negative, float, and values over 3600', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    await startStageAction(s0);

    expect(await extendStageAction(s0, 0)).toMatchObject({ ok: false, code: 'invalid_extend_amount' });
    expect(await extendStageAction(s0, -1)).toMatchObject({ ok: false, code: 'invalid_extend_amount' });
    expect(await extendStageAction(s0, 3_601)).toMatchObject({ ok: false, code: 'invalid_extend_amount' });
    expect(await extendStageAction(s0, 1.5)).toMatchObject({ ok: false, code: 'invalid_extend_amount' });
  });

  // ── advance moves pointer + completes current ─────────────────────────────
  test('advance completes current stage and moves session pointer to next', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { session, stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    const s1 = mustGet(stages, 1);

    await startStageAction(s0);
    expect(await advanceStageAction(s0)).toEqual({ ok: true });

    const completedStage = await getStageRow(s0);
    expect(completedStage.status).toBe('completed');
    expect(completedStage.ended_at).not.toBeNull();
    expect(completedStage.paused_at).toBeNull();

    const nextStage = await getStageRow(s1);
    expect(nextStage.status).toBe('pending');

    const sess = await getSessionRow(session.id);
    expect(sess.current_stage_id).toBe(s1);
  });

  // ── advance from last stage → no_next_stage ──────────────────────────────
  test('advance from the last stage returns no_next_stage', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    const lastStage = mustGet(stages, stages.length - 1, 'last stage');

    await startStageAction(lastStage);
    expect(await advanceStageAction(lastStage)).toEqual({ ok: false, code: 'no_next_stage' });
  });

  // ── rollback resets from + target ─────────────────────────────────────────
  test('rollback resets from-stage to pending and target back to active', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { session, stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    const s1 = mustGet(stages, 1);

    // Drive: s0 → active → completed, pointer moves to s1, s1 → active
    await startStageAction(s0);
    await advanceStageAction(s0); // s0 → completed; pointer → s1
    await startStageAction(s1);  // s1 → active

    expect(await rollbackStageAction(s0)).toEqual({ ok: true });

    // s0 should be active again with fresh started_at, all runtime cleared
    const target = await getStageRow(s0);
    expect(target.status).toBe('active');
    expect(target.started_at).not.toBeNull();
    expect(target.ended_at).toBeNull();
    expect(target.paused_at).toBeNull();
    expect(target.total_paused_ms).toBe(0);
    expect(target.extended_seconds).toBe(0);

    // s1 (the "from" stage) should be back to pending with all runtime cleared
    const fromStage = await getStageRow(s1);
    expect(fromStage.status).toBe('pending');
    expect(fromStage.started_at).toBeNull();
    expect(fromStage.ended_at).toBeNull();
    expect(fromStage.paused_at).toBeNull();
    expect(fromStage.total_paused_ms).toBe(0);
    expect(fromStage.extended_seconds).toBe(0);

    // Session pointer moved back to s0
    const sess = await getSessionRow(session.id);
    expect(sess.current_stage_id).toBe(s0);

    // stage_events audit row written for rollback
    const admin = getAdminClient();
    const rollbackEvent = await admin
      .from('stage_events')
      .select('verb, metadata, stage_id')
      .eq('verb', 'rollback')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(rollbackEvent.data?.verb).toBe('rollback');
    expect(rollbackEvent.data?.stage_id).toBe(s0); // the target stage we rolled into
    expect(rollbackEvent.data?.metadata).toMatchObject({ from_stage_id: s1, into_stage_id: s0 });
  });

  // ── rollback on a pending stage → invalid_transition ─────────────────────
  test('rollback on a non-completed stage returns invalid_transition', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { stages } = await freshSession();
    // stages[0] is pending — not completed → should fail the state-machine gate
    const result = await rollbackStageAction(mustGet(stages, 0));
    expect(result).toMatchObject({ ok: false, code: 'invalid_transition', verb: 'rollback' });
  });

  // ── rollback when sessions.current_stage_id is null ──────────────────────
  test('rollback when sessions.current_stage_id is null → no_previous_completed_stage', async () => {
    const { session, stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    currentClient = await signInAs(fx.facilitator);

    await startStageAction(s0);
    await advanceStageAction(s0); // s0 completed, next stage becomes current_stage_id

    // Manually clear the pointer to simulate a previously-broken-state row.
    const admin = getAdminClient();
    await admin.from('sessions').update({ current_stage_id: null }).eq('id', session.id);

    const result = await rollbackStageAction(s0);
    expect(result).toMatchObject({ ok: false, code: 'no_previous_completed_stage' });
  });

  // ── extend rejects null-duration stages ──────────────────────────────────
  test('extend rejects null-duration stages', async () => {
    currentClient = await signInAs(fx.facilitator);
    const { session, stages } = await freshSession();
    const s0 = mustGet(stages, 0);

    // Null out duration_seconds on all stages in the session.
    const admin = getAdminClient();
    await admin.from('stages').update({ duration_seconds: null }).eq('session_id', session.id);

    await startStageAction(s0);
    const result = await extendStageAction(s0, 60);
    expect(result).toMatchObject({ ok: false, code: 'invalid_extend_amount' });
  });

  // ── extend accepts the boundary value 3600 seconds ───────────────────────
  test('extend accepts the boundary value 3600 seconds', async () => {
    const { stages } = await freshSession();
    const s0 = mustGet(stages, 0);
    currentClient = await signInAs(fx.facilitator);

    await startStageAction(s0);
    const result = await extendStageAction(s0, 3600);
    expect(result).toEqual({ ok: true });
  });

  // ── not_facilitator: org member who isn't the facilitator ────────────────
  test('org member who is not the facilitator gets not_facilitator', async () => {
    // participant is an org member so RLS lets them read the stage,
    // but the action's facilitator_id check rejects them.
    currentClient = await signInAs(fx.participant);
    const { stages } = await freshSession();
    const result = await startStageAction(mustGet(stages, 0));
    expect(result).toMatchObject({ ok: false, code: 'not_facilitator' });
  });

  // ── stage_not_found: outsider not in org — RLS hides the row ─────────────
  test('outsider not in org gets stage_not_found (RLS hides the row)', async () => {
    currentClient = await signInAs(fx.outsider);
    const { stages } = await freshSession();
    const result = await startStageAction(mustGet(stages, 0));
    expect(result).toEqual({ ok: false, code: 'stage_not_found' });
  });

  // ── stage_events written for each successful verb ─────────────────────────
  test('each successful action writes a stage_event row', async () => {
    currentClient = await signInAs(fx.facilitator);
    const admin = getAdminClient();
    const { stages } = await freshSession();
    const s0 = mustGet(stages, 0);

    await startStageAction(s0);
    await pauseStageAction(s0);
    await resumeStageAction(s0);
    await extendStageAction(s0, 30);
    await advanceStageAction(s0);

    const eventsRes = await admin
      .from('stage_events')
      .select('verb')
      .eq('stage_id', s0)
      .order('created_at', { ascending: true });

    const verbs = eventsRes.data?.map((e: { verb: string }) => e.verb) ?? [];
    expect(verbs).toEqual(['start', 'pause', 'resume', 'extend', 'advance']);
  });
});
