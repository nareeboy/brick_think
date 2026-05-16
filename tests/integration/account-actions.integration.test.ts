// Integration coverage for updateProfileAction on /app/account.
//
// Verifies:
//   * Owner can set their own display name, and the action returns the
//     trimmed value alongside an 'ok' result.
//   * An empty string clears the field to null (matches the header
//     fallback logic in app/(authed)/app/layout.tsx — null → email).
//   * Over-length input is rejected with a typed 'invalid_input' result,
//     not a thrown error.
//   * RLS: a write to someone else's row is silently a no-op (RLS update
//     using/with-check enforces id = auth.uid()), so the outsider can't
//     overwrite the owner's name even if they bypass our action.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    throw new Error(`__redirect__:${url ?? ''}`);
  },
}));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

import { updateProfileAction } from '@/app/(authed)/app/account/actions';

interface Fixture {
  owner: TestUser;
  outsider: TestUser;
}

let fx: Fixture;

beforeAll(async () => {
  fx = {
    owner: await createTestUser(),
    outsider: await createTestUser(),
  };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('updateProfileAction', () => {
  test('saves a trimmed display name and reads back from the profile row', async () => {
    currentClient = await signInAs(fx.owner);
    const result = await updateProfileAction('  Naresh  ');
    expect(result).toEqual({ kind: 'ok', fullName: 'Naresh' });

    const admin = getAdminClient();
    const verify = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', fx.owner.id)
      .single();
    expect(verify.data?.full_name).toBe('Naresh');
  });

  test('an empty string clears full_name to null', async () => {
    currentClient = await signInAs(fx.owner);
    await updateProfileAction('Something');
    const cleared = await updateProfileAction('   ');
    expect(cleared).toEqual({ kind: 'ok', fullName: null });

    const admin = getAdminClient();
    const verify = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', fx.owner.id)
      .single();
    expect(verify.data?.full_name).toBeNull();
  });

  test('rejects names longer than the 80-character cap with invalid_input', async () => {
    currentClient = await signInAs(fx.owner);
    const result = await updateProfileAction('x'.repeat(81));
    expect(result.kind).toBe('invalid_input');
    if (result.kind === 'invalid_input') {
      expect(result.reason).toMatch(/80/);
    }
  });

  test('RLS prevents an outsider from overwriting another user’s name', async () => {
    // First the owner sets their own name.
    currentClient = await signInAs(fx.owner);
    await updateProfileAction('Owner Name');

    // Then the outsider signs in and tries to update the owner's row directly
    // (bypassing the action's auth.uid() resolution). RLS update USING/CHECK
    // ties the row to auth.uid(); the outsider's update is silently a no-op.
    const outsiderClient = await signInAs(fx.outsider);
    const probe = await outsiderClient
      .from('profiles')
      .update({ full_name: 'Hijacked' })
      .eq('id', fx.owner.id);
    expect(probe.error).toBeNull();

    const admin = getAdminClient();
    const verify = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', fx.owner.id)
      .single();
    expect(verify.data?.full_name).toBe('Owner Name');
  });
});
