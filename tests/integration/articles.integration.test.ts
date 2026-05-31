// Integration coverage for the articles CMS surface.
//
// Verifies:
//   * RLS — anon and authenticated non-admin can read PUBLISHED articles
//     but NOT drafts.
//   * RLS — only site admins can INSERT / UPDATE / DELETE articles.
//   * Server actions enforce the same gate (defence in depth) and
//     surface the expected codes (forbidden, slug_taken, not_found).
//   * publish / unpublish flips status and stamps published_at on first
//     publish; unpublish preserves the timestamp.
//   * The site-admin SQL helper public.is_site_admin() returns the
//     caller's flag.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
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

import {
  createArticleAction,
  deleteArticleAction,
  publishArticleAction,
  unpublishArticleAction,
  updateArticleAction,
} from '@/app/(authed)/app/admin/cms/articles/actions';

interface Fixture {
  admin: TestUser;
  outsider: TestUser;
}

let fx: Fixture;
const createdArticleIds: string[] = [];

function fdFor(input: {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  publishedDate?: string;
}): FormData {
  const fd = new FormData();
  if (input.id) fd.set('id', input.id);
  fd.set('title', input.title);
  fd.set('slug', input.slug);
  fd.set('excerpt', input.excerpt ?? '');
  fd.set('body', input.body ?? '');
  if (input.publishedDate !== undefined) fd.set('publishedDate', input.publishedDate);
  return fd;
}

beforeAll(async () => {
  fx = {
    admin: await createTestUser(),
    outsider: await createTestUser(),
  };
  const admin = getAdminClient();
  const flip = await admin
    .from('profiles')
    .update({ is_site_admin: true })
    .eq('id', fx.admin.id);
  if (flip.error) throw new Error(`Could not flip is_site_admin: ${flip.error.message}`);
});

afterAll(async () => {
  if (!fx) return;
  const admin = getAdminClient();
  if (createdArticleIds.length > 0) {
    await admin.from('articles').delete().in('id', createdArticleIds);
  }
  await cleanupTestUser(fx.admin.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('public.is_site_admin()', () => {
  test('returns true for the admin user and false for the outsider', async () => {
    const adminClient = await signInAs(fx.admin);
    const adminRes = await adminClient.rpc('is_site_admin');
    expect(adminRes.error).toBeNull();
    expect(adminRes.data).toBe(true);

    const outsiderClient = await signInAs(fx.outsider);
    const outsiderRes = await outsiderClient.rpc('is_site_admin');
    expect(outsiderRes.error).toBeNull();
    expect(outsiderRes.data).toBe(false);
  });
});

describe('createArticleAction', () => {
  test('admin can create a draft and read it back', async () => {
    currentClient = await signInAs(fx.admin);
    const fd = fdFor({
      title: 'First article',
      slug: 'first-article',
      excerpt: 'A summary.',
      body: '# Hello\n\nWorld.',
    });
    let redirectUrl: string | null = null;
    try {
      await createArticleAction(fd);
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith('__redirect__:')) {
        redirectUrl = message.slice('__redirect__:'.length);
      } else {
        throw err;
      }
    }
    expect(redirectUrl).toMatch(/^\/app\/admin\/cms\/articles\//);

    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id, slug, title, status, body_markdown')
      .eq('slug', 'first-article')
      .maybeSingle();
    expect(row.data?.status).toBe('draft');
    expect(row.data?.title).toBe('First article');
    expect(row.data?.body_markdown).toBe('# Hello\n\nWorld.');
    if (row.data) createdArticleIds.push(row.data.id);
  });

  test('non-admin is rejected with forbidden, no row written', async () => {
    currentClient = await signInAs(fx.outsider);
    const fd = fdFor({ title: 'Sneaky', slug: 'sneaky', body: 'x' });
    const result = await createArticleAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');

    const admin = getAdminClient();
    const row = await admin.from('articles').select('id').eq('slug', 'sneaky').maybeSingle();
    expect(row.data).toBeNull();
  });

  test('rejects invalid slug', async () => {
    currentClient = await signInAs(fx.admin);
    const fd = fdFor({ title: 'Bad slug', slug: 'Not A Slug', body: '' });
    const result = await createArticleAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_slug');
  });

  test('rejects duplicate slug with slug_taken', async () => {
    currentClient = await signInAs(fx.admin);
    const fd = fdFor({ title: 'Dup', slug: 'first-article', body: '' });
    const result = await createArticleAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('slug_taken');
  });
});

describe('publish / unpublish + public read RLS', () => {
  test('drafts hide from anon; published rows appear to anon', async () => {
    // Find the first-article row id.
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id, slug')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    const anonClient = makeFreshAnon();

    // Draft → invisible to anon.
    const draftRead = await anonClient.from('articles').select('id').eq('id', id);
    expect(draftRead.error).toBeNull();
    expect(draftRead.data).toEqual([]);

    // Publish.
    currentClient = await signInAs(fx.admin);
    const pubResult = await publishArticleAction(id);
    expect(pubResult.ok).toBe(true);
    const afterPub = await admin
      .from('articles')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(afterPub.data?.status).toBe('published');
    expect(afterPub.data?.published_at).not.toBeNull();
    const firstPublishedAt = afterPub.data?.published_at as string;

    // Published → visible to anon.
    const publishedRead = await anonClient.from('articles').select('id, slug').eq('id', id);
    expect(publishedRead.data?.[0]?.slug).toBe('first-article');

    // Unpublish keeps published_at but flips status back.
    const unpub = await unpublishArticleAction(id);
    expect(unpub.ok).toBe(true);
    const afterUnpub = await admin
      .from('articles')
      .select('status, published_at')
      .eq('id', id)
      .single();
    expect(afterUnpub.data?.status).toBe('draft');
    expect(afterUnpub.data?.published_at).toBe(firstPublishedAt);

    // Anon can no longer see it.
    const unpublishedRead = await anonClient.from('articles').select('id').eq('id', id);
    expect(unpublishedRead.data).toEqual([]);
  });
});

describe('non-admin direct DB writes are blocked by RLS', () => {
  test('outsider INSERT is refused', async () => {
    const outsider = await signInAs(fx.outsider);
    const ins = await outsider
      .from('articles')
      .insert({ slug: 'rls-attempt', title: 'rls' })
      .select('id');
    expect(ins.error).not.toBeNull();
  });

  test('outsider UPDATE on existing row is a no-op (or rejected)', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id, title')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    const outsider = await signInAs(fx.outsider);
    const upd = await outsider
      .from('articles')
      .update({ title: 'Pwned' })
      .eq('id', id)
      .select('id');
    // Either RLS rejects with an error or silently affects zero rows.
    if (!upd.error) expect(upd.data ?? []).toEqual([]);

    const verify = await admin.from('articles').select('title').eq('id', id).single();
    expect(verify.data?.title).not.toBe('Pwned');
  });

  test('outsider DELETE is refused or affects zero rows', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    const outsider = await signInAs(fx.outsider);
    const del = await outsider.from('articles').delete().eq('id', id).select('id');
    if (!del.error) expect(del.data ?? []).toEqual([]);

    const verify = await admin.from('articles').select('id').eq('id', id).single();
    expect(verify.data?.id).toBe(id);
  });
});

describe('updateArticleAction', () => {
  test('admin can update title and body', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    currentClient = await signInAs(fx.admin);
    const fd = fdFor({
      id,
      title: 'First article (edited)',
      slug: 'first-article',
      body: '## Updated',
    });
    const result = await updateArticleAction(fd);
    expect(result.ok).toBe(true);

    const verify = await admin
      .from('articles')
      .select('title, body_markdown')
      .eq('id', id)
      .single();
    expect(verify.data?.title).toBe('First article (edited)');
    expect(verify.data?.body_markdown).toBe('## Updated');
  });

  test('non-admin update via action is rejected with forbidden', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    currentClient = await signInAs(fx.outsider);
    const fd = fdFor({ id, title: 'Hack', slug: 'first-article', body: '' });
    const result = await updateArticleAction(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });
});

describe('deleteArticleAction', () => {
  test('non-admin delete is rejected; row survives', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    currentClient = await signInAs(fx.outsider);
    const result = await deleteArticleAction(id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');

    const verify = await admin.from('articles').select('id').eq('id', id).maybeSingle();
    expect(verify.data?.id).toBe(id);
  });

  test('admin delete removes the row', async () => {
    const admin = getAdminClient();
    const row = await admin
      .from('articles')
      .select('id')
      .eq('slug', 'first-article')
      .single();
    const id = row.data!.id as string;

    currentClient = await signInAs(fx.admin);
    let redirected = false;
    try {
      await deleteArticleAction(id);
    } catch (err) {
      if ((err as Error).message.startsWith('__redirect__:')) {
        redirected = true;
      } else {
        throw err;
      }
    }
    expect(redirected).toBe(true);

    const verify = await admin.from('articles').select('id').eq('id', id).maybeSingle();
    expect(verify.data).toBeNull();
    const removeIdx = createdArticleIds.indexOf(id);
    if (removeIdx >= 0) createdArticleIds.splice(removeIdx, 1);
  });
});

describe('updateArticleAction — editable published date', () => {
  test('sets published_at to the noon-UTC instant on a published article', async () => {
    currentClient = await signInAs(fx.admin);

    let createdId = '';
    try {
      await createArticleAction(fdFor({ title: 'Date Edit', slug: 'date-edit', body: 'x' }));
    } catch (err) {
      if (!(err as Error).message.startsWith('__redirect__:')) throw err;
    }
    const admin = getAdminClient();
    const created = await admin.from('articles').select('id').eq('slug', 'date-edit').single();
    createdId = created.data!.id as string;
    createdArticleIds.push(createdId);

    const pub = await publishArticleAction(createdId);
    expect(pub.ok).toBe(true);

    const result = await updateArticleAction(
      fdFor({ id: createdId, title: 'Date Edit', slug: 'date-edit', body: 'x', publishedDate: '2020-01-15' }),
    );
    expect(result.ok).toBe(true);

    const verify = await admin
      .from('articles')
      .select('published_at')
      .eq('id', createdId)
      .single();
    expect(new Date(verify.data!.published_at as string).toISOString()).toBe('2020-01-15T12:00:00.000Z');
  });

  test('ignores publishedDate on a draft (published_at stays null)', async () => {
    currentClient = await signInAs(fx.admin);
    try {
      await createArticleAction(fdFor({ title: 'Draft Date', slug: 'draft-date', body: 'x' }));
    } catch (err) {
      if (!(err as Error).message.startsWith('__redirect__:')) throw err;
    }
    const admin = getAdminClient();
    const created = await admin.from('articles').select('id').eq('slug', 'draft-date').single();
    const id = created.data!.id as string;
    createdArticleIds.push(id);

    const result = await updateArticleAction(
      fdFor({ id, title: 'Draft Date', slug: 'draft-date', body: 'x', publishedDate: '2020-01-15' }),
    );
    expect(result.ok).toBe(true);

    const verify = await admin.from('articles').select('published_at').eq('id', id).single();
    expect(verify.data!.published_at).toBeNull();
  });

  test('rejects an invalid date with invalid_published_date', async () => {
    currentClient = await signInAs(fx.admin);
    try {
      await createArticleAction(fdFor({ title: 'Bad Date', slug: 'bad-date', body: 'x' }));
    } catch (err) {
      if (!(err as Error).message.startsWith('__redirect__:')) throw err;
    }
    const admin = getAdminClient();
    const created = await admin.from('articles').select('id').eq('slug', 'bad-date').single();
    const id = created.data!.id as string;
    createdArticleIds.push(id);

    const result = await updateArticleAction(
      fdFor({ id, title: 'Bad Date', slug: 'bad-date', body: 'x', publishedDate: '2020-02-30' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_published_date');
  });
});

function makeFreshAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
