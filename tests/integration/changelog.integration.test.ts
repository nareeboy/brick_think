// Integration coverage for the changelog admin surface.
//
// Verifies:
//   * RLS — anon reads PUBLISHED entries only, never drafts.
//   * RLS — a non-admin authenticated user cannot INSERT.
//   * Server actions enforce the admin gate (forbidden) and surface
//     validation codes (invalid_category).
//   * publish / unpublish flips status, stamps published_at on publish,
//     and preserves the timestamp on unpublish.
//   * getLatestPublishedVersionTag returns the newest published tag.

import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
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
vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    throw new Error(`__redirect__:${url ?? ''}`);
  },
  notFound: () => {
    throw new Error('__notFound__');
  },
}));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

const admin = getAdminClient();

let adminUser: TestUser;
let plainUser: TestUser;
const createdIds: string[] = [];

async function makeEntry(fields: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin
    .from('changelog_entries')
    .insert(fields)
    .select('id')
    .single();
  if (error) throw error;
  createdIds.push(data.id);
  return data.id;
}

// Drive createEntryAction (which redirects on success) and recover the new id
// from the mocked redirect throw, registering it for cleanup. Caller must set
// `currentClient` to a site-admin client first.
async function createViaAction(fields: {
  title: string;
  category?: string;
  versionTag?: string;
  publishedDate?: string;
}): Promise<string> {
  const { createEntryAction } = await import('@/app/(authed)/app/admin/changelog/actions');
  const fd = new FormData();
  fd.set('title', fields.title);
  fd.set('category', fields.category ?? 'feature');
  if (fields.versionTag) fd.set('versionTag', fields.versionTag);
  if (fields.publishedDate) fd.set('publishedDate', fields.publishedDate);
  try {
    await createEntryAction(fd);
  } catch (e) {
    const id = (e as Error).message.match(/^__redirect__:\/app\/admin\/changelog\/(.+)$/)?.[1];
    if (!id) throw e;
    createdIds.push(id);
    return id;
  }
  throw new Error('createEntryAction did not redirect');
}

beforeAll(async () => {
  adminUser = await createTestUser();
  plainUser = await createTestUser();
  const flip = await admin.from('profiles').update({ is_site_admin: true }).eq('id', adminUser.id);
  if (flip.error) throw new Error(`Could not flip is_site_admin: ${flip.error.message}`);
});

afterAll(async () => {
  if (createdIds.length) {
    await admin.from('changelog_entries').delete().in('id', createdIds);
  }
  if (adminUser) await cleanupTestUser(adminUser.id);
  if (plainUser) await cleanupTestUser(plainUser.id);
});

beforeEach(() => {
  currentClient = null;
});

describe('RLS', () => {
  test('anon reads published, not drafts', async () => {
    const pub = await makeEntry({
      title: 'Public entry',
      category: 'feature',
      status: 'published',
      published_at: new Date().toISOString(),
    });
    await makeEntry({ title: 'Secret draft', category: 'fix', status: 'draft' });

    const anon = makeAnonClient();
    const { data, error } = await anon.from('changelog_entries').select('id, title, status');
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(pub);
    expect((data ?? []).every((r) => r.status === 'published')).toBe(true);
  });

  test('non-admin cannot insert', async () => {
    const client = await signInAs(plainUser);
    const { error } = await client
      .from('changelog_entries')
      .insert({ title: 'Nope', category: 'feature' });
    expect(error).not.toBeNull();
  });
});

describe('server actions', () => {
  test('non-admin is forbidden from creating', async () => {
    currentClient = await signInAs(plainUser);
    const { createEntryAction } = await import('@/app/(authed)/app/admin/changelog/actions');
    const fd = new FormData();
    fd.set('title', 'Hi');
    fd.set('category', 'feature');
    const res = await createEntryAction(fd);
    expect(res).toEqual({ ok: false, code: 'forbidden' });
  });

  test('admin create rejects invalid category', async () => {
    currentClient = await signInAs(adminUser);
    const { createEntryAction } = await import('@/app/(authed)/app/admin/changelog/actions');
    const fd = new FormData();
    fd.set('title', 'Valid title');
    fd.set('category', 'bogus');
    const res = await createEntryAction(fd);
    expect(res).toEqual({ ok: false, code: 'invalid_category' });
  });

  test('publish then unpublish keeps published_at', async () => {
    const id = await makeEntry({ title: 'Toggle me', category: 'improvement', status: 'draft' });
    currentClient = await signInAs(adminUser);
    const { publishEntryAction, unpublishEntryAction } =
      await import('@/app/(authed)/app/admin/changelog/actions');

    const pubRes = await publishEntryAction(id);
    expect(pubRes.ok).toBe(true);
    const afterPublish = await admin
      .from('changelog_entries')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(afterPublish.data?.status).toBe('published');
    expect(afterPublish.data?.published_at).not.toBeNull();

    const unpubRes = await unpublishEntryAction(id);
    expect(unpubRes.ok).toBe(true);
    const afterUnpublish = await admin
      .from('changelog_entries')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(afterUnpublish.data?.status).toBe('draft');
    expect(afterUnpublish.data?.published_at).not.toBeNull();
  });
});

describe('date control', () => {
  test('create stores the chosen date on a draft', async () => {
    currentClient = await signInAs(adminUser);
    const id = await createViaAction({ title: 'Dated draft', publishedDate: '2026-03-15' });
    const row = await admin
      .from('changelog_entries')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(row.data?.status).toBe('draft');
    expect(row.data?.published_at?.slice(0, 10)).toBe('2026-03-15');
  });

  test('publish honors a date set before publishing (does not overwrite with now)', async () => {
    currentClient = await signInAs(adminUser);
    const id = await createViaAction({ title: 'Pre-dated', publishedDate: '2026-02-20' });
    const { publishEntryAction } = await import('@/app/(authed)/app/admin/changelog/actions');
    const res = await publishEntryAction(id);
    expect(res.ok).toBe(true);
    const row = await admin
      .from('changelog_entries')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(row.data?.status).toBe('published');
    expect(row.data?.published_at?.slice(0, 10)).toBe('2026-02-20');
  });
});

describe('getLatestPublishedVersionTag', () => {
  test('returns the newest published tag', async () => {
    await makeEntry({
      title: 'Older tagged',
      category: 'feature',
      version_tag: 'v1.0',
      status: 'published',
      published_at: '2026-01-01T12:00:00.000Z',
    });
    // Far-future published_at so it outranks any other published+tagged row
    // created earlier in this run — keeps the assertion deterministic.
    await makeEntry({
      title: 'Newer tagged',
      category: 'feature',
      version_tag: 'v2.0',
      status: 'published',
      published_at: '2027-01-01T12:00:00.000Z',
    });
    currentClient = makeAnonClient();
    const { getLatestPublishedVersionTag } = await import('@/lib/changelog/queries');
    const tag = await getLatestPublishedVersionTag();
    expect(tag).toBe('v2.0');
  });
});
