// RLS invariants for session-scoped designs (stream #2). Backfills the
// vitest-against-local-Supabase coverage deferred by the original ship —
// punch list at:
//   docs/superpowers/followups/2026-05-14-session-scoped-designs-deferred-tests.md
//
// Runs via `pnpm test:integration` against the local Supabase stack. Each
// test creates its own disposable users + org + session and cleans up in
// `afterAll`. No `pnpm db:reset` between tests.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
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

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  outsider: TestUser;
  admin: TestUser;
  org: TestOrg;
  outsiderOrg: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const outsider = await createTestUser();
  const orgAdmin = await createTestUser();

  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: orgAdmin.id, role: 'admin' });

  // The outsider belongs to a completely separate org and is never invited
  // into `org`. They should not be able to see any session-scoped row.
  const outsiderOrg = await createTestOrg({ ownerId: outsider.id });

  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'RLS invariant fixture',
  });

  fx = {
    facilitator,
    participant,
    outsider,
    admin: orgAdmin,
    org,
    outsiderOrg,
    session,
  };
});

afterAll(async () => {
  if (!fx) return;
  // Order: delete fixtures owned by users, then the users themselves.
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
  await cleanupTestUser(fx.admin.id);
  await cleanupTestUser(fx.outsider.id);
});

// Helper: insert a session model owned by `ownerId` in a given stage. The
// admin client bypasses RLS so we can seed rows the user-scoped client
// would have to go through createModelInStage to produce.
async function seedSessionModel(opts: {
  sessionId: string;
  stageId: string;
  ownerId: string;
  title?: string;
}): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: opts.ownerId,
      session_id: opts.sessionId,
      stage_id: opts.stageId,
      title: opts.title ?? 'fixture',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedSessionModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

describe('RLS — SELECT on session-scoped models', () => {
  test("org member can SELECT another member's session-scoped model", async () => {
    // Facilitator's own model in the individual_model stage.
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.individual_model,
      ownerId: fx.facilitator.id,
      title: 'facilitator individual',
    });

    const participantClient = await signInAs(fx.participant);
    const res = await participantClient
      .from('models')
      .select('id, title, owner_profile_id')
      .eq('id', modelId)
      .maybeSingle();
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe(modelId);
    expect(res.data?.owner_profile_id).toBe(fx.facilitator.id);
  });

  test('non-member of the session org cannot SELECT', async () => {
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.shared_model,
      ownerId: fx.facilitator.id,
      title: 'shared fixture',
    });

    const outsiderClient = await signInAs(fx.outsider);
    const res = await outsiderClient.from('models').select('id').eq('id', modelId).maybeSingle();
    // RLS returns no row — not an error. `maybeSingle()` resolves to data=null.
    expect(res.error).toBeNull();
    expect(res.data).toBeNull();
  });
});

describe('RLS — UPDATE on session-scoped models', () => {
  test('non-owner non-facilitator session reader cannot UPDATE', async () => {
    // Facilitator owns this row; participant is in the org so can read but
    // is not facilitator nor admin — must not be able to UPDATE.
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.system_model,
      ownerId: fx.facilitator.id,
      title: 'before-update',
    });

    const participantClient = await signInAs(fx.participant);
    const updateRes = await participantClient
      .from('models')
      .update({ title: 'after-update-by-participant' })
      .eq('id', modelId)
      .select('id');
    // RLS filters silently — 0 rows updated, no error code thrown.
    expect(updateRes.error).toBeNull();
    expect(updateRes.data ?? []).toHaveLength(0);

    // Confirm the title did not change via admin readback.
    const admin = getAdminClient();
    const verify = await admin.from('models').select('title').eq('id', modelId).single();
    expect(verify.data?.title).toBe('before-update');
  });

  test("facilitator can UPDATE another participant's session-scoped model", async () => {
    // Participant owns a row; facilitator should be able to rename it.
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.guiding_principles,
      ownerId: fx.participant.id,
      title: 'participant-original',
    });

    const facilitatorClient = await signInAs(fx.facilitator);
    const updateRes = await facilitatorClient
      .from('models')
      .update({ title: 'facilitator-renamed' })
      .eq('id', modelId)
      .select('id, title')
      .single();
    expect(updateRes.error).toBeNull();
    expect(updateRes.data?.title).toBe('facilitator-renamed');
  });
});

describe('RLS — DELETE on session-scoped models', () => {
  test("facilitator can DELETE a participant's session model", async () => {
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.skill_building,
      ownerId: fx.participant.id,
      title: 'participant-to-delete-by-facilitator',
    });

    const facilitatorClient = await signInAs(fx.facilitator);
    const delRes = await facilitatorClient.from('models').delete().eq('id', modelId).select('id');
    expect(delRes.error).toBeNull();
    expect(delRes.data ?? []).toHaveLength(1);
  });

  test("org admin can DELETE a participant's session model", async () => {
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.individual_model,
      ownerId: fx.participant.id,
      title: 'participant-to-delete-by-admin',
    });

    const adminClient = await signInAs(fx.admin);
    const delRes = await adminClient.from('models').delete().eq('id', modelId).select('id');
    expect(delRes.error).toBeNull();
    expect(delRes.data ?? []).toHaveLength(1);
  });
});

describe('RLS — soft delete is refused on session-scoped models', () => {
  test('owner cannot soft-delete a session model', async () => {
    const modelId = await seedSessionModel({
      sessionId: fx.session.id,
      stageId: fx.session.stageIds.shared_model,
      ownerId: fx.participant.id,
      title: 'attempted-soft-delete',
    });

    const participantClient = await signInAs(fx.participant);
    const updateRes = await participantClient
      .from('models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', modelId)
      .select('id');
    // PG evaluates USING + WITH CHECK across all permissive UPDATE policies.
    // The active-update policy's USING matches (owner, active) so the row
    // IS visible for UPDATE — but no policy's WITH CHECK accepts the new
    // row (the hardened soft-delete policy requires session_id IS NULL).
    // Result: explicit 42501 RLS violation, not a silent no-op. That's a
    // stronger invariant than silent filtering — the database actively
    // refuses rather than quietly dropping the write.
    expect(updateRes.error?.code).toBe('42501');

    const admin = getAdminClient();
    const verify = await admin.from('models').select('deleted_at').eq('id', modelId).single();
    expect(verify.data?.deleted_at).toBeNull();
  });
});

describe('schema invariants', () => {
  test('check constraint rejects rows with both org_id and session_id set', async () => {
    const admin = getAdminClient();
    // Create a transient org owned by the facilitator so we have an org_id
    // value the foreign key will accept.
    const tempOrg = await createTestOrg({
      ownerId: fx.facilitator.id,
      name: 'check-constraint-temp',
    });
    const res = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.facilitator.id,
        title: 'both-contexts',
        canvas_state: EMPTY_CANVAS_STATE,
        org_id: tempOrg.id,
        session_id: fx.session.id,
        stage_id: fx.session.stageIds.individual_model,
      })
      .select('id');
    expect(res.error).not.toBeNull();
    // 23514 = check_violation
    expect(res.error?.code).toBe('23514');
    // Cleanup the temp org.
    await admin.from('organisations').delete().eq('id', tempOrg.id);
  });

  test('composite FK rejects (stage_id, session_id) pair from a different session', async () => {
    // Spin up a second session under the same org. Its stage ids cannot be
    // paired with the first session's id — the composite FK fails.
    const otherSession = await createTestSession({
      orgId: fx.org.id,
      facilitatorId: fx.facilitator.id,
      title: 'cross-session-fk',
    });
    const admin = getAdminClient();
    const res = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.facilitator.id,
        title: 'cross-session-fk-attempt',
        canvas_state: EMPTY_CANVAS_STATE,
        session_id: fx.session.id,
        stage_id: otherSession.stageIds.individual_model,
      })
      .select('id');
    expect(res.error).not.toBeNull();
    // 23503 = foreign_key_violation
    expect(res.error?.code).toBe('23503');
    // Cleanup the extra session.
    await admin.from('sessions').delete().eq('id', otherSession.id);
  });

  test('deleting parent session cascades to its stages and models', async () => {
    const transientSession = await createTestSession({
      orgId: fx.org.id,
      facilitatorId: fx.facilitator.id,
      title: 'cascade-target',
    });
    const modelId = await seedSessionModel({
      sessionId: transientSession.id,
      stageId: transientSession.stageIds.individual_model,
      ownerId: fx.facilitator.id,
      title: 'cascade-candidate',
    });

    const admin = getAdminClient();
    const delRes = await admin.from('sessions').delete().eq('id', transientSession.id).select('id');
    expect(delRes.error).toBeNull();
    expect(delRes.data ?? []).toHaveLength(1);

    const modelLookup = await admin.from('models').select('id').eq('id', modelId).maybeSingle();
    expect(modelLookup.error).toBeNull();
    expect(modelLookup.data).toBeNull();

    const stagesLookup = await admin
      .from('stages')
      .select('id')
      .eq('session_id', transientSession.id);
    expect(stagesLookup.error).toBeNull();
    expect(stagesLookup.data ?? []).toHaveLength(0);
  });
});

describe('createModelInStage idempotency', () => {
  test('concurrent inserts for the same (session, stage, owner) resolve to one model', async () => {
    // Two parallel inserts through the user-scoped client. The partial
    // unique index `models_session_stage_owner_active_idx` forces a 23505
    // on the loser; the winner stays. Three outcomes are acceptable:
    //   - both succeed because PG happened to serialise them and the
    //     second insert saw the first via MVCC (rare under read-committed)
    //   - one succeeds + one 23505 (the expected case)
    // Either way, exactly one row exists at the end.
    const stageId = fx.session.stageIds.skill_building;
    const facilitatorClient = await signInAs(fx.facilitator);

    function insertOnce() {
      return facilitatorClient
        .from('models')
        .insert({
          owner_profile_id: fx.facilitator.id,
          session_id: fx.session.id,
          stage_id: stageId,
          title: 'race',
          canvas_state: EMPTY_CANVAS_STATE,
        })
        .select('id');
    }

    const results = await Promise.all([insertOnce(), insertOnce()]);

    const errors = results.filter((r) => r.error).map((r) => r.error?.code);
    // At most one race-loser, and if it failed it must be unique-violation.
    expect(errors.length).toBeLessThanOrEqual(1);
    for (const code of errors) {
      expect(code).toBe('23505');
    }

    const admin = getAdminClient();
    const survivors = await admin
      .from('models')
      .select('id')
      .eq('session_id', fx.session.id)
      .eq('stage_id', stageId)
      .eq('owner_profile_id', fx.facilitator.id)
      .is('deleted_at', null);
    expect(survivors.error).toBeNull();
    expect(survivors.data ?? []).toHaveLength(1);
  });
});
