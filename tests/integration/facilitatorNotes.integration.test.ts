// Integration tests for facilitator-notes helper + action.
//
// Privacy is enforced at the data-access layer (not via RLS) because
// facilitator_notes is a text column on sessions whose row-level access
// is already granted to every org member. getFacilitatorNotes is the
// only projection point; updateFacilitatorNotesAction is the only writer.
//
// Pattern matches scenarios.integration.test.ts:
//   - vi.mock('next/cache') + vi.mock('@/lib/db/server') before the
//     module-under-test imports
//   - currentClient swapped per-test via signInAs
//   - getServiceSupabaseClient is NOT mocked — talks to local stack

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

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

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

import { updateFacilitatorNotesAction } from '@/app/(authed)/app/sessions/notes-actions';
import { FACILITATOR_NOTES_MAX, getFacilitatorNotes } from '@/lib/sessions/facilitatorNotes';

interface Fixture {
  facilitator: TestUser;
  member: TestUser;
  admin: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const member = await createTestUser();
  const adminUser = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: adminUser.id, role: 'admin' });

  const session = await createTestSession({ orgId: org.id, facilitatorId: facilitator.id });

  fx = { facilitator, member, admin: adminUser, outsider, org, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.admin.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('updateFacilitatorNotesAction + getFacilitatorNotes', () => {
  test('facilitator writes and reads back the same string', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await updateFacilitatorNotesAction(fx.session.id, 'Private prep notes.');
    expect(result).toEqual({ ok: true });

    currentClient = await signInAs(fx.facilitator);
    const read = await getFacilitatorNotes(fx.session.id);
    expect(read).toBe('Private prep notes.');
  });

  test('empty string normalises to null', async () => {
    // Seed a value first so the clear is observable.
    const admin = getAdminClient();
    await admin
      .from('sessions')
      .update({ facilitator_notes: 'prior content' })
      .eq('id', fx.session.id);

    currentClient = await signInAs(fx.facilitator);
    expect(await updateFacilitatorNotesAction(fx.session.id, '')).toEqual({ ok: true });

    currentClient = await signInAs(fx.facilitator);
    expect(await getFacilitatorNotes(fx.session.id)).toBeNull();
  });

  test('whitespace-only string normalises to null', async () => {
    const admin = getAdminClient();
    await admin.from('sessions').update({ facilitator_notes: 'something' }).eq('id', fx.session.id);

    currentClient = await signInAs(fx.facilitator);
    expect(await updateFacilitatorNotesAction(fx.session.id, '   \n\t  ')).toEqual({ ok: true });

    currentClient = await signInAs(fx.facilitator);
    expect(await getFacilitatorNotes(fx.session.id)).toBeNull();
  });

  test('over-cap (8001 chars) is rejected', async () => {
    currentClient = await signInAs(fx.facilitator);
    const tooLong = 'x'.repeat(FACILITATOR_NOTES_MAX + 1);
    const result = await updateFacilitatorNotesAction(fx.session.id, tooLong);
    expect(result).toEqual({ ok: false, code: 'over_cap' });
  });

  test('exact cap (8000 chars) is accepted', async () => {
    currentClient = await signInAs(fx.facilitator);
    const atCap = 'y'.repeat(FACILITATOR_NOTES_MAX);
    const result = await updateFacilitatorNotesAction(fx.session.id, atCap);
    expect(result).toEqual({ ok: true });

    currentClient = await signInAs(fx.facilitator);
    expect(await getFacilitatorNotes(fx.session.id)).toBe(atCap);
  });

  test('non-facilitator org member: action refuses, helper returns null', async () => {
    // Seed a real value so we can prove the helper hides it from the member.
    const admin = getAdminClient();
    await admin
      .from('sessions')
      .update({ facilitator_notes: 'facilitator-only' })
      .eq('id', fx.session.id);

    currentClient = await signInAs(fx.member);
    expect(await updateFacilitatorNotesAction(fx.session.id, 'sneaky')).toEqual({
      ok: false,
      code: 'not_facilitator',
    });

    currentClient = await signInAs(fx.member);
    expect(await getFacilitatorNotes(fx.session.id)).toBeNull();

    // Value on disk is unchanged.
    const sess = await admin
      .from('sessions')
      .select('facilitator_notes')
      .eq('id', fx.session.id)
      .single();
    expect(sess.data?.facilitator_notes).toBe('facilitator-only');
  });

  test('org admin (not the facilitator) gets the same privacy treatment', async () => {
    const admin = getAdminClient();
    await admin
      .from('sessions')
      .update({ facilitator_notes: 'facilitator-only' })
      .eq('id', fx.session.id);

    currentClient = await signInAs(fx.admin);
    expect(await updateFacilitatorNotesAction(fx.session.id, 'admin-overrides')).toEqual({
      ok: false,
      code: 'not_facilitator',
    });

    currentClient = await signInAs(fx.admin);
    expect(await getFacilitatorNotes(fx.session.id)).toBeNull();

    const sess = await admin
      .from('sessions')
      .select('facilitator_notes')
      .eq('id', fx.session.id)
      .single();
    expect(sess.data?.facilitator_notes).toBe('facilitator-only');
  });

  test('outsider (non-member): action returns session_not_found, helper returns null', async () => {
    // Outsider cannot see the row at all under RLS through the action's service
    // lookup path; they still get not_facilitator OR session_not_found depending
    // on whether the service client sees the row. The service client bypasses
    // RLS, so the row IS found → not_facilitator is the actual code.
    currentClient = await signInAs(fx.outsider);
    const result = await updateFacilitatorNotesAction(fx.session.id, 'nope');
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });

    currentClient = await signInAs(fx.outsider);
    expect(await getFacilitatorNotes(fx.session.id)).toBeNull();
  });

  test('unknown session id: action returns session_not_found', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await updateFacilitatorNotesAction('00000000-0000-0000-0000-000000000000', 'x');
    expect(result).toEqual({ ok: false, code: 'session_not_found' });
  });

  test('unauthenticated: action refuses', async () => {
    // Build an anon client with no signed-in user.
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    currentClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    expect(await updateFacilitatorNotesAction(fx.session.id, 'x')).toEqual({
      ok: false,
      code: 'unauthenticated',
    });
  });
});
