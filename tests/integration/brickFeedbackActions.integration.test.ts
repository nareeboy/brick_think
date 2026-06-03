// Integration tests for brick-feedback server actions.
//
// Pattern mirrors scenarios.integration.test.ts: per-file mock of next/cache
// and @/lib/db/server so the action calls swap in a freshly signed-in anon
// client via `currentClient`. RLS is exercised end-to-end — the
// can_edit_room walk decides who can react / comment / soft-delete.
//
// Fixture has a room-backed shared_model canvas seeded via setSharedModelRooms
// so both reactions and comments tables behave as in production.

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { COMMENT_BODY_MAX } from '@/lib/brickFeedback/palette';
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

// Imports AFTER mocks register.
import {
  addCommentAction,
  softDeleteCommentAction,
  toggleReactionAction,
} from '@/app/(authed)/app/sessions/brick-feedback-actions';
import { setSharedModelRooms } from '@/app/(authed)/app/sessions/stage-room-actions';

interface Fixture {
  facilitator: TestUser;
  /** Primary author for comment-deletion tests; enrolled in the shared room. */
  member: TestUser;
  /** A second room member used to assert "not the author" deletion paths. */
  otherMember: TestUser;
  /** Org outsider — not in the org, therefore not in the room. */
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
  /** Room-backed model id on the shared_model stage (both members enrolled). */
  modelId: string;
}

let fx: Fixture;
const BRICK_ID = 'b_test_brick_1';

beforeAll(async () => {
  const facilitator = await createTestUser();
  const member = await createTestUser();
  const otherMember = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: otherMember.id, role: 'member' });
  // outsider is intentionally NOT added to the org.
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'brick feedback fixture',
  });

  // Seed a single shared_model room containing both members. The facilitator
  // is intentionally NOT enrolled so we can exercise the org-member /
  // non-room-member axis cleanly.
  currentClient = await signInAs(facilitator);
  const roomsRes = await setSharedModelRooms({
    stageId: session.stageIds.shared_model,
    rooms: [{ title: 'Team A', profileIds: [member.id, otherMember.id] }],
  });
  if (!roomsRes.ok) {
    throw new Error(`setSharedModelRooms failed in fixture: ${roomsRes.code}`);
  }
  const admin = getAdminClient();
  const modelRes = await admin
    .from('models')
    .select('id')
    .eq('room_id', roomsRes.data.roomIds[0])
    .single();
  if (modelRes.error || !modelRes.data) {
    throw new Error('failed to resolve room model id');
  }

  fx = {
    facilitator,
    member,
    otherMember,
    outsider,
    org,
    session,
    modelId: modelRes.data.id as string,
  };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.otherMember.id);
  await cleanupTestUser(fx.outsider.id);
});

// Reset the feedback tables for the seeded model between tests so each case
// starts from a known empty state. Cheap (single delete per table per test)
// and stops test order from coupling.
beforeEach(async () => {
  if (!fx) return;
  const admin = getAdminClient();
  await admin.from('brick_reactions').delete().eq('model_id', fx.modelId);
  await admin.from('brick_comments').delete().eq('model_id', fx.modelId);
});

describe('toggleReactionAction', () => {
  test('adds a reaction when none exists', async () => {
    currentClient = await signInAs(fx.member);
    const res = await toggleReactionAction(fx.modelId, BRICK_ID, '👍');
    expect(res).toEqual({ ok: true, isReacted: true });

    const admin = getAdminClient();
    const rows = await admin
      .from('brick_reactions')
      .select('emoji')
      .eq('model_id', fx.modelId)
      .eq('brick_id', BRICK_ID)
      .eq('profile_id', fx.member.id);
    expect(rows.data).toHaveLength(1);
    expect(rows.data?.[0]?.emoji).toBe('👍');
  });

  test('toggling an existing reaction removes it', async () => {
    currentClient = await signInAs(fx.member);
    const first = await toggleReactionAction(fx.modelId, BRICK_ID, '❤️');
    expect(first).toEqual({ ok: true, isReacted: true });

    const second = await toggleReactionAction(fx.modelId, BRICK_ID, '❤️');
    expect(second).toEqual({ ok: true, isReacted: false });

    const admin = getAdminClient();
    const rows = await admin
      .from('brick_reactions')
      .select('emoji')
      .eq('model_id', fx.modelId)
      .eq('brick_id', BRICK_ID)
      .eq('profile_id', fx.member.id)
      .eq('emoji', '❤️');
    expect(rows.data).toHaveLength(0);
  });

  test('invalid emoji is rejected', async () => {
    currentClient = await signInAs(fx.member);
    const res = await toggleReactionAction(fx.modelId, BRICK_ID, '🦄');
    expect(res).toEqual({ ok: false, code: 'invalid_emoji' });
  });

  test('non-room-member (org outsider) cannot react', async () => {
    currentClient = await signInAs(fx.outsider);
    const res = await toggleReactionAction(fx.modelId, BRICK_ID, '👍');
    expect(res).toEqual({ ok: false, code: 'cannot_edit_room' });
  });

  test('unauthenticated caller is rejected', async () => {
    // A brand-new anon client without a signed-in user.
    const env = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
    if (!env.url || !env.anon) throw new Error('test env missing');
    const { createClient } = await import('@supabase/supabase-js');
    currentClient = createClient(env.url, env.anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const res = await toggleReactionAction(fx.modelId, BRICK_ID, '👍');
    expect(res).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('addCommentAction', () => {
  test('inserts a comment and returns its id', async () => {
    currentClient = await signInAs(fx.member);
    const res = await addCommentAction(fx.modelId, BRICK_ID, '  Looks great  ');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.commentId).toMatch(/^[0-9a-f-]{36}$/);

    const admin = getAdminClient();
    const row = await admin
      .from('brick_comments')
      .select('body, profile_id, model_id, brick_id, deleted_at')
      .eq('id', res.commentId)
      .single();
    // Trim is applied before insert.
    expect(row.data?.body).toBe('Looks great');
    expect(row.data?.profile_id).toBe(fx.member.id);
    expect(row.data?.model_id).toBe(fx.modelId);
    expect(row.data?.brick_id).toBe(BRICK_ID);
    expect(row.data?.deleted_at).toBeNull();
  });

  test('empty body (after trim) is rejected', async () => {
    currentClient = await signInAs(fx.member);
    const res = await addCommentAction(fx.modelId, BRICK_ID, '   \n  ');
    expect(res).toEqual({ ok: false, code: 'empty_body' });
  });

  test('body over the cap is rejected before DB', async () => {
    currentClient = await signInAs(fx.member);
    const body = 'a'.repeat(COMMENT_BODY_MAX + 1);
    const res = await addCommentAction(fx.modelId, BRICK_ID, body);
    expect(res).toEqual({ ok: false, code: 'over_cap' });
  });

  test('non-room-member cannot comment (RLS rejects insert)', async () => {
    currentClient = await signInAs(fx.outsider);
    const res = await addCommentAction(fx.modelId, BRICK_ID, 'hello');
    expect(res).toEqual({ ok: false, code: 'cannot_edit_room' });
  });
});

describe('softDeleteCommentAction', () => {
  async function seedComment(author: TestUser, body = 'placeholder'): Promise<string> {
    const admin = getAdminClient();
    const ins = await admin
      .from('brick_comments')
      .insert({
        model_id: fx.modelId,
        brick_id: BRICK_ID,
        profile_id: author.id,
        body,
      })
      .select('id')
      .single();
    if (ins.error || !ins.data) throw new Error(`seedComment failed: ${ins.error?.message}`);
    return ins.data.id as string;
  }

  test('author can soft-delete their own comment', async () => {
    const commentId = await seedComment(fx.member);

    currentClient = await signInAs(fx.member);
    const res = await softDeleteCommentAction(commentId);
    expect(res).toEqual({ ok: true });

    const admin = getAdminClient();
    const row = await admin
      .from('brick_comments')
      .select('deleted_at')
      .eq('id', commentId)
      .single();
    expect(row.data?.deleted_at).not.toBeNull();
  });

  test("a different room member cannot delete someone else's comment", async () => {
    const commentId = await seedComment(fx.member);

    // otherMember is in the same room as the author, so RLS lets them READ
    // the row — but only the author is allowed to soft-delete it. We need
    // the in-room peer here (not the facilitator) because the facilitator
    // is not enrolled in the room, so RLS would hide the row entirely and
    // we'd see `comment_not_found` rather than `not_author`.
    currentClient = await signInAs(fx.otherMember);
    const res = await softDeleteCommentAction(commentId);
    expect(res).toEqual({ ok: false, code: 'not_author' });

    const admin = getAdminClient();
    const row = await admin
      .from('brick_comments')
      .select('deleted_at')
      .eq('id', commentId)
      .single();
    expect(row.data?.deleted_at).toBeNull();
  });

  test('already-deleted comment surfaces already_deleted', async () => {
    const commentId = await seedComment(fx.member);
    const admin = getAdminClient();
    await admin
      .from('brick_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    currentClient = await signInAs(fx.member);
    const res = await softDeleteCommentAction(commentId);
    expect(res).toEqual({ ok: false, code: 'already_deleted' });
  });
});
