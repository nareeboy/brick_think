// tests/integration/session-invitations-realtime.integration.test.ts
//
// Locks in: with `public.session_invitations` in the supabase_realtime
// publication and REPLICA IDENTITY FULL, a facilitator subscribed with the
// same `session_id=eq.` filter RosterPendingInvitesList uses receives the
// DELETE payload when an invitation is cancelled. Without REPLICA IDENTITY
// FULL the old row carries only the primary key, the session_id filter can
// never match, and the pending-invites list goes stale — a second Cancel
// click then surfaces `invitation_not_found`.
//
// Sibling pattern: models-realtime.integration.test.ts (test-client fixture +
// real local Supabase + Realtime). Polyfill in tests/integration/setup.ts
// provides globalThis.WebSocket for supabase-js's RealtimeClient.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  facilitator: TestUser;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
  });
  fx = { facilitator, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
});

describe('session_invitations Realtime delivery', () => {
  test('facilitator receives the DELETE payload when an invitation is cancelled', async () => {
    const facClient = await signInAs(fx.facilitator);
    const { data: sessionData } = await facClient.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('no facilitator JWT');
    facClient.realtime.setAuth(token);

    const deletedIds: string[] = [];
    const channel: RealtimeChannel = facClient.channel(`pending-invites:${fx.session.id}`).on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'session_invitations',
        filter: `session_id=eq.${fx.session.id}`,
      },
      (payload) => {
        const old = payload.old as { id?: string };
        if (old.id) deletedIds.push(old.id);
      },
    );

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('subscribe timeout')), 5000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer);
            resolve();
          }
        });
      });

      // Insert then delete an invitation via service role (mirrors
      // cancelInvitationAction's hard delete). On a freshly booted stack
      // Realtime can report SUBSCRIBED before its postgres_changes worker
      // actually delivers, silently dropping the first events — so re-issue
      // a fresh insert+delete pair every 2s while waiting.
      const admin = getAdminClient();
      const issued: string[] = [];
      const issueCancel = async () => {
        const email = `invite-${issued.length}-${fx.session.id.slice(0, 8)}@brick-think.test`;
        const { data: inserted, error: insErr } = await admin
          .from('session_invitations')
          .insert({ session_id: fx.session.id, email, invited_by: fx.facilitator.id })
          .select('id')
          .single();
        expect(insErr).toBeNull();
        if (!inserted) throw new Error('invitation insert failed');
        issued.push(inserted.id);
        const { error: delErr } = await admin
          .from('session_invitations')
          .delete()
          .eq('id', inserted.id);
        expect(delErr).toBeNull();
      };
      await issueCancel();

      const deadline = Date.now() + 20_000;
      let lastWrite = Date.now();
      while (deletedIds.length < 1) {
        if (Date.now() > deadline) throw new Error('no Realtime DELETE delivery within 20s');
        if (Date.now() - lastWrite > 2_000) {
          await issueCancel();
          lastWrite = Date.now();
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(issued).toContain(deletedIds[0]!);
    } finally {
      await facClient.removeChannel(channel);
    }
  });
});
