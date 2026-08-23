// Integration coverage for the create_workshop_with_session RPC and the
// createWorkshopWithSession service that wraps it.
//
// The point of the RPC is atomicity: a failure partway through must leave
// NOTHING behind, not a workshop with no session.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { setActionClient } from './_helpers/action-mocks';
import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

import { createWorkshopWithSession } from '@/lib/workshops/service';

let owner: TestUser;

beforeAll(async () => {
  owner = await createTestUser();
});

afterAll(async () => {
  if (owner) await cleanupTestUser(owner.id);
});

describe('createWorkshopWithSession', () => {
  test('creates workshop, session and five stages in one call', async () => {
    const supabase = await signInAs(owner);
    setActionClient(supabase);

    const slug = `sprint-${Date.now().toString(36)}`;
    const res = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'Product Sprint',
      slug,
      sessionTitle: 'Discovery Day',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const admin = getAdminClient();
    const stages = await admin
      .from('stages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', res.data.sessionId);
    expect(stages.count).toBe(5);

    // The migration's `return next` hands back two independently-typed
    // uuids (org_id, session_id) -- an org_id/session_id transposition
    // would be invisible to the type system, so check the returned orgId
    // really is the created session's org_id, not just "a" uuid.
    const sessionRow = await admin
      .from('sessions')
      .select('org_id')
      .eq('id', res.data.sessionId)
      .single();
    expect(sessionRow.error).toBeNull();
    expect(sessionRow.data?.org_id).toBe(res.data.orgId);
  });

  test('a duplicate slug leaves no workshop and no session behind', async () => {
    const supabase = await signInAs(owner);
    setActionClient(supabase);

    const slug = `dupe-${Date.now().toString(36)}`;
    const first = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'First',
      slug,
      sessionTitle: 'One',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const admin = getAdminClient();
    // Scoped to this test's own org/slug, not a generic title string -- the
    // integration DB is shared across ~35 test files, so a bare
    // `.eq('title', 'Two')` filter would be racy against unrelated rows.
    const orgsBefore = await admin
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug);
    const sessionsBefore = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', first.data.orgId);

    const second = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'Second',
      slug,
      sessionTitle: 'Two',
    });
    expect(second).toEqual({ ok: false, code: 'slug_taken' });

    // The rollback proof for THIS failure mode: a duplicate-slug rejection
    // must not add a second organisations row for the slug, nor any second
    // session under the first (successful) org. Note this specific failure
    // happens at the very first insert (organisations, on the unique slug
    // constraint) -- it demonstrates the duplicate-slug path is side-effect
    // free, not cross-statement rollback in general. That stronger claim
    // (a LATER insert's failure undoing EARLIER successful inserts in the
    // same call) is proven separately below, by forcing failure on the
    // last insert instead.
    const orgsAfter = await admin
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug);
    const sessionsAfter = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', first.data.orgId);

    expect(orgsAfter.count).toBe(orgsBefore.count ?? 0);
    expect(sessionsAfter.count).toBe(sessionsBefore.count ?? 0);
  });

  test('a stage-insert failure rolls back the already-inserted workshop and session', async () => {
    // The duplicate-slug test above fails at the FIRST insert
    // (organisations), so it can't tell an atomic transaction apart from a
    // naive sequence of round-trips that happens to bail in order -- the
    // session/stage inserts are never even attempted in that scenario.
    // This test forces failure at the LAST insert instead (stages, via a
    // stage_type that isn't in the enum), after the organisations and
    // sessions inserts inside the SAME function call have already
    // succeeded. If the whole call weren't one transaction -- e.g. a nested
    // `begin ... exception when others then ...` swallowing the stages
    // failure, or the function split back into separate statements -- the
    // org and session rows below would survive. They must not.
    //
    // The service can't produce this payload (it always builds `stageRows`
    // from CANONICAL_STAGE_TYPES), so this calls the RPC directly --
    // mirroring the existing create_session_with_stages sibling probe in
    // createSession.integration.test.ts ("rolls back the session row when
    // the stages payload is rejected").
    const supabase = await signInAs(owner);
    const slug = `atomicity-${Date.now().toString(36)}`;
    const sessionTitle = `atomicity-probe-${Date.now()}`;

    const rpc = await supabase.rpc('create_workshop_with_session', {
      p_name: 'Atomicity Probe',
      p_slug: slug,
      p_owner_id: owner.id,
      p_session_title: sessionTitle,
      p_stages: [{ stage_type: 'not_a_real_stage_type', position: 0, duration_seconds: 60 }],
    });
    expect(rpc.error).not.toBeNull();

    const admin = getAdminClient();
    const orgRow = await admin.from('organisations').select('id').eq('slug', slug);
    expect(orgRow.error).toBeNull();
    expect(orgRow.data?.length ?? -1).toBe(0);

    const sessionRow = await admin.from('sessions').select('id').eq('title', sessionTitle);
    expect(sessionRow.error).toBeNull();
    expect(sessionRow.data?.length ?? -1).toBe(0);
  });
});
