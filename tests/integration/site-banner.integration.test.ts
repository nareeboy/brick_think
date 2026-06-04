// tests/integration/site-banner.integration.test.ts
//
// Integration coverage for the site banner singleton.
//
// Verifies:
//   * RLS — anon/non-admin read the row only while is_active = true.
//   * RLS — a non-admin authenticated user cannot UPDATE.
//   * saveBannerAction enforces the admin gate (forbidden) and validates type.
//   * saveBannerAction toggles active + content; getActiveBanner reflects it
//     and returns null when inactive or empty; the version (updated_at) bumps.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { type SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  makeAnonClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

const admin = getAdminClient();
let adminUser: TestUser;
let plainUser: TestUser;

// Reset the singleton row to inactive defaults (admin/service-role bypasses RLS).
async function resetBanner() {
  const { error } = await admin
    .from('site_banner')
    .update({ is_active: false, type: 'info', message: '', updated_by: null })
    .eq('id', true);
  if (error) throw error;
}

beforeAll(async () => {
  adminUser = await createTestUser();
  plainUser = await createTestUser();
  const flip = await admin.from('profiles').update({ is_site_admin: true }).eq('id', adminUser.id);
  if (flip.error) throw new Error(`Could not flip is_site_admin: ${flip.error.message}`);
});

afterAll(async () => {
  await resetBanner();
  if (adminUser) await cleanupTestUser(adminUser.id);
  if (plainUser) await cleanupTestUser(plainUser.id);
});

beforeEach(() => {
  currentClient = null;
});

afterEach(async () => {
  await resetBanner();
});

describe('RLS', () => {
  test('anon cannot read the row while inactive, can read while active', async () => {
    const anon = makeAnonClient();

    const inactive = await anon.from('site_banner').select('id, type, message').maybeSingle();
    expect(inactive.error).toBeNull();
    expect(inactive.data).toBeNull();

    await admin
      .from('site_banner')
      .update({ is_active: true, type: 'warning', message: 'DB slow' })
      .eq('id', true);

    const active = await anon.from('site_banner').select('id, type, message').maybeSingle();
    expect(active.error).toBeNull();
    expect(active.data?.message).toBe('DB slow');
  });

  test('non-admin authenticated user cannot update the row', async () => {
    const client = await signInAs(plainUser);
    await client.from('site_banner').update({ is_active: true, message: 'hax' }).eq('id', true);
    // RLS blocks the row; the update affects 0 rows (no change).
    const check = await admin.from('site_banner').select('message').eq('id', true).single();
    expect(check.data?.message).toBe('');
  });
});

describe('saveBannerAction', () => {
  test('forbids non-admins', async () => {
    const { saveBannerAction } = await import('@/app/(authed)/app/admin/banner/actions');
    currentClient = await signInAs(plainUser);
    const form = new FormData();
    form.set('isActive', 'true');
    form.set('type', 'info');
    form.set('message', 'hi');
    const res = await saveBannerAction(form);
    expect(res).toEqual({ ok: false, code: 'forbidden' });
  });

  test('rejects an invalid type', async () => {
    const { saveBannerAction } = await import('@/app/(authed)/app/admin/banner/actions');
    currentClient = await signInAs(adminUser);
    const form = new FormData();
    form.set('isActive', 'true');
    form.set('type', 'bogus');
    form.set('message', 'hi');
    const res = await saveBannerAction(form);
    expect(res).toEqual({ ok: false, code: 'invalid_type' });
  });

  test('admin saves; getActiveBanner reflects active/empty and version bumps', async () => {
    const { saveBannerAction } = await import('@/app/(authed)/app/admin/banner/actions');
    const { getActiveBanner } = await import('@/lib/banner/queries');

    currentClient = await signInAs(adminUser);
    const form = new FormData();
    form.set('isActive', 'true');
    form.set('type', 'error');
    form.set('message', 'API issue');
    expect(await saveBannerAction(form)).toEqual({ ok: true });

    currentClient = makeAnonClient();
    const first = await getActiveBanner();
    expect(first?.type).toBe('error');
    expect(first?.message).toBe('API issue');
    const firstVersion = first?.version;

    // Re-save (same content) as admin → version must bump.
    currentClient = await signInAs(adminUser);
    expect(await saveBannerAction(form)).toEqual({ ok: true });
    currentClient = makeAnonClient();
    const second = await getActiveBanner();
    expect(second?.version).not.toBe(firstVersion);

    // Deactivate → getActiveBanner returns null.
    currentClient = await signInAs(adminUser);
    const off = new FormData();
    off.set('isActive', 'false');
    off.set('type', 'error');
    off.set('message', 'API issue');
    expect(await saveBannerAction(off)).toEqual({ ok: true });
    currentClient = makeAnonClient();
    expect(await getActiveBanner()).toBeNull();
  });
});
