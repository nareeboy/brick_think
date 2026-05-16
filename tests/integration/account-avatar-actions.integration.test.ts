// Integration coverage for updateAvatarAction + removeAvatarAction.
//
// Verifies:
//   * Owner can upload a 256x256 PNG blob → object lands at
//     'avatars/<uid>/avatar.png', profiles.avatar_url is set to the public
//     URL with a ?v=<digits> cache-buster.
//   * Rejects non-PNG MIME (image/jpeg) with kind='error', reason='invalid_image'.
//   * Rejects oversize blob (> 100 KB) with same error shape.
//   * removeAvatarAction nulls avatar_url + deletes the storage object,
//     and is idempotent on second invocation.
//   * RLS: an outsider's RLS-scoped client cannot upload to
//     'avatars/<owner-uid>/avatar.png'.

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

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

// These imports MUST appear after the vi.mock calls so the action picks up
// the mocked next/cache and lib/db/server modules.
import {
  removeAvatarAction,
  updateAvatarAction,
} from '@/app/(authed)/app/account/actions';

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
  // Clean up any storage objects left behind by tests so subsequent runs
  // start from a clean slate. Use the admin client; storage.remove on a
  // missing key is a silent no-op.
  const admin = getAdminClient();
  await admin.storage.from('avatars').remove([`${fx.owner.id}/avatar.png`]);
  await admin.storage.from('avatars').remove([`${fx.outsider.id}/avatar.png`]);
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.outsider.id);
});

beforeEach(async () => {
  // Each test signs in fresh; null out so an accidentally-unguarded test
  // throws loudly rather than reusing the previous user.
  currentClient = null;
});

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A. The server validates with
// lib/images/validatePng.isPng, which only inspects the first 8 bytes.
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeBlob(mime: string, size: number): Blob {
  const buf = new Uint8Array(size);
  if (mime === 'image/png' && size >= PNG_MAGIC.length) {
    buf.set(PNG_MAGIC, 0);
  }
  return new Blob([buf], { type: mime });
}

function formDataWith(blob: Blob): FormData {
  const fd = new FormData();
  fd.append('avatar', blob, 'avatar.png');
  return fd;
}

describe('updateAvatarAction', () => {
  test('uploads a valid PNG and writes the public URL with a cache-buster', async () => {
    currentClient = await signInAs(fx.owner);
    const result = await updateAvatarAction(formDataWith(fakeBlob('image/png', 4096)));

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.url).toMatch(
      new RegExp(
        `/storage/v1/object/public/avatars/${fx.owner.id}/avatar\\.png\\?v=\\d+$`,
      ),
    );

    const admin = getAdminClient();
    const verify = await admin
      .from('profiles')
      .select('avatar_url')
      .eq('id', fx.owner.id)
      .single();
    expect(verify.data?.avatar_url).toBe(result.url);

    // Confirm the object exists in storage.
    const list = await admin.storage.from('avatars').list(fx.owner.id);
    expect(list.error).toBeNull();
    expect(list.data?.some((entry) => entry.name === 'avatar.png')).toBe(true);
  });

  test('rejects a non-PNG MIME with invalid_image', async () => {
    currentClient = await signInAs(fx.owner);
    const result = await updateAvatarAction(
      formDataWith(fakeBlob('image/jpeg', 4096)),
    );
    expect(result).toEqual({ kind: 'error', reason: 'invalid_image' });
  });

  test('rejects a blob over the 100 KB cap with invalid_image', async () => {
    currentClient = await signInAs(fx.owner);
    const oversize = fakeBlob('image/png', 100 * 1024 + 1);
    const result = await updateAvatarAction(formDataWith(oversize));
    expect(result).toEqual({ kind: 'error', reason: 'invalid_image' });
  });

  test('rejects a PNG MIME blob with non-PNG magic bytes (anti-spoof)', async () => {
    currentClient = await signInAs(fx.owner);
    const buf = new Uint8Array(4096); // zeroed — no PNG magic
    const lying = new Blob([buf], { type: 'image/png' });
    const fd = new FormData();
    fd.append('avatar', lying, 'avatar.png');
    const result = await updateAvatarAction(fd);
    expect(result).toEqual({ kind: 'error', reason: 'invalid_image' });
  });

  test("RLS prevents an outsider from writing the owner's avatar object", async () => {
    // Outsider signs in. Their RLS-scoped client should be refused by the
    // storage.objects insert policy when the path's first folder is not
    // their auth.uid().
    const outsiderClient = await signInAs(fx.outsider);
    const path = `${fx.owner.id}/avatar.png`;
    const blob = fakeBlob('image/png', 1024);
    const upload = await outsiderClient.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/png' });
    expect(upload.error).not.toBeNull();
  });
});

describe('removeAvatarAction', () => {
  test('deletes the storage object and nulls avatar_url; idempotent on retry', async () => {
    // Seed: upload first via the action.
    currentClient = await signInAs(fx.owner);
    const seeded = await updateAvatarAction(formDataWith(fakeBlob('image/png', 4096)));
    expect(seeded.kind).toBe('ok');

    const first = await removeAvatarAction();
    expect(first.kind).toBe('ok');

    const admin = getAdminClient();
    const after = await admin
      .from('profiles')
      .select('avatar_url')
      .eq('id', fx.owner.id)
      .single();
    expect(after.data?.avatar_url).toBeNull();

    const list = await admin.storage.from('avatars').list(fx.owner.id);
    expect(list.data?.some((entry) => entry.name === 'avatar.png')).toBe(false);

    // Second call must not throw and must return ok — idempotent.
    const second = await removeAvatarAction();
    expect(second.kind).toBe('ok');
  });
});
