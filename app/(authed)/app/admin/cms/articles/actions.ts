'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  ARTICLE_BODY_MAX,
  ARTICLE_COVER_MAX_BYTES,
  ARTICLE_EXCERPT_MAX,
  ARTICLE_TITLE_MAX,
} from '@/lib/articles/constants';
import { isValidSlug, slugify } from '@/lib/articles/slug';
import { isValidPublishedDateInput, publishedDateToInstant } from '@/lib/articles/publishedDate';
import { ARTICLE_COVERS_BUCKET } from '@/lib/articles/storage';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Database } from '@/lib/db/types.generated';
import { isJpeg } from '@/lib/images/validateJpeg';
import { isPng } from '@/lib/images/validatePng';

type Code =
  | 'forbidden'
  | 'unauthenticated'
  | 'not_found'
  | 'invalid_title'
  | 'invalid_slug'
  | 'invalid_excerpt'
  | 'invalid_body'
  | 'invalid_cover'
  | 'invalid_credit_url'
  | 'invalid_published_date'
  | 'slug_taken'
  | 'unknown';

export type ArticleActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; code: Code; message?: string };

interface ArticleInput {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  coverCreditName: string;
  coverCreditUrl: string;
  coverCreditSource: string;
  coverCreditSourceUrl: string;
  publishedDate: string;
}

const CREDIT_NAME_MAX = 120;
const CREDIT_SOURCE_MAX = 60;
const CREDIT_URL_MAX = 2000;

// URLs entered for image attribution must be absolute http(s). Reject
// `javascript:` / `data:` / etc. early so the rendered link in the public page
// is always safe — even though we already wrap the anchor with rel=noopener
// noreferrer + target=_blank.
function isValidExternalUrl(value: string): boolean {
  if (value.length === 0) return true; // empty is "no link", allowed
  if (value.length > CREDIT_URL_MAX) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function requireAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }
  | ArticleActionResult
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };
  const { data, error } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data?.is_site_admin) return { ok: false, code: 'forbidden' };
  return { supabase, userId: user.id };
}

function validate(input: ArticleInput): Code | null {
  const title = input.title.trim();
  if (title.length === 0 || title.length > ARTICLE_TITLE_MAX) return 'invalid_title';
  const slug = input.slug.trim();
  if (!isValidSlug(slug)) return 'invalid_slug';
  if (input.excerpt.length > ARTICLE_EXCERPT_MAX) return 'invalid_excerpt';
  if (input.bodyMarkdown.length > ARTICLE_BODY_MAX) return 'invalid_body';
  if (input.coverCreditName.length > CREDIT_NAME_MAX) return 'invalid_credit_url';
  if (input.coverCreditSource.length > CREDIT_SOURCE_MAX) return 'invalid_credit_url';
  if (!isValidExternalUrl(input.coverCreditUrl)) return 'invalid_credit_url';
  if (!isValidExternalUrl(input.coverCreditSourceUrl)) return 'invalid_credit_url';
  if (!isValidPublishedDateInput(input.publishedDate)) return 'invalid_published_date';
  return null;
}

function readField(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

function readInput(formData: FormData): ArticleInput {
  const id = formData.get('id');
  const titleRaw = formData.get('title');
  const slugRaw = formData.get('slug');
  const bodyRaw = formData.get('body');
  const title = typeof titleRaw === 'string' ? titleRaw : '';
  let slug = typeof slugRaw === 'string' ? slugRaw.trim() : '';
  if (!slug && title) slug = slugify(title);
  return {
    id: typeof id === 'string' && id ? id : undefined,
    title,
    slug,
    excerpt: readField(formData, 'excerpt'),
    bodyMarkdown: typeof bodyRaw === 'string' ? bodyRaw : '',
    coverCreditName: readField(formData, 'coverCreditName'),
    coverCreditUrl: readField(formData, 'coverCreditUrl'),
    coverCreditSource: readField(formData, 'coverCreditSource'),
    coverCreditSourceUrl: readField(formData, 'coverCreditSourceUrl'),
    publishedDate: readField(formData, 'publishedDate'),
  };
}

// Normalise empty strings to null so the DB stores the absence of attribution
// uniformly, not as zero-length strings that the rendering code would still
// treat as truthy.
function creditFields(input: ArticleInput): {
  cover_credit_name: string | null;
  cover_credit_url: string | null;
  cover_credit_source: string | null;
  cover_credit_source_url: string | null;
} {
  return {
    cover_credit_name: input.coverCreditName.length === 0 ? null : input.coverCreditName,
    cover_credit_url: input.coverCreditUrl.length === 0 ? null : input.coverCreditUrl,
    cover_credit_source: input.coverCreditSource.length === 0 ? null : input.coverCreditSource,
    cover_credit_source_url:
      input.coverCreditSourceUrl.length === 0 ? null : input.coverCreditSourceUrl,
  };
}

function revalidateArticleSurfaces(slug?: string | null) {
  revalidatePath('/app/admin/cms/articles');
  revalidatePath('/app/admin');
  if (slug) revalidatePath(`/articles/${slug}`);
  revalidatePath('/articles');
}

export async function createArticleAction(formData: FormData): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase, userId } = guard;
  const input = readInput(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  const insertRes = await supabase
    .from('articles')
    .insert({
      title: input.title.trim(),
      slug: input.slug,
      excerpt: input.excerpt.length === 0 ? null : input.excerpt,
      body_markdown: input.bodyMarkdown,
      status: 'draft',
      author_profile_id: userId,
      ...creditFields(input),
    })
    .select('id, slug')
    .single();

  if (insertRes.error) {
    if (insertRes.error.code === '23505') return { ok: false, code: 'slug_taken' };
    return { ok: false, code: 'unknown', message: insertRes.error.message };
  }

  revalidateArticleSurfaces(insertRes.data.slug);
  redirect(`/app/admin/cms/articles/${insertRes.data.id}`);
}

export async function updateArticleAction(formData: FormData): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const input = readInput(formData);
  if (!input.id) return { ok: false, code: 'not_found' };
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  // Server must not trust the client's "this is published" decision: re-read
  // the row's status. published_at is applied only to published rows, and an
  // empty date input means "leave as-is" — we never write null (that would
  // violate articles_published_has_timestamp and silently wipe the date).
  const existing = await supabase
    .from('articles')
    .select('status')
    .eq('id', input.id)
    .maybeSingle();
  if (!existing.data) return { ok: false, code: 'not_found' };

  const updateFields: Database['public']['Tables']['articles']['Update'] = {
    title: input.title.trim(),
    slug: input.slug,
    excerpt: input.excerpt.length === 0 ? null : input.excerpt,
    body_markdown: input.bodyMarkdown,
    ...creditFields(input),
  };
  if (input.publishedDate.length > 0 && existing.data.status === 'published') {
    updateFields.published_at = publishedDateToInstant(input.publishedDate);
  }

  const updateRes = await supabase
    .from('articles')
    .update(updateFields)
    .eq('id', input.id)
    .select('id, slug')
    .single();

  if (updateRes.error) {
    if (updateRes.error.code === '23505') return { ok: false, code: 'slug_taken' };
    if (updateRes.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown', message: updateRes.error.message };
  }

  revalidateArticleSurfaces(updateRes.data.slug);
  return { ok: true, id: updateRes.data.id, slug: updateRes.data.slug };
}

export async function publishArticleAction(id: string): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const updateRes = await supabase
    .from('articles')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (updateRes.error) {
    if (updateRes.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown', message: updateRes.error.message };
  }
  revalidateArticleSurfaces(updateRes.data.slug);
  return { ok: true, id: updateRes.data.id, slug: updateRes.data.slug };
}

export async function unpublishArticleAction(id: string): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  // published_at stays — keeps the original publish timestamp for the audit
  // trail and means re-publishing doesn't reset history. Status is the
  // visibility gate; the RLS policy reads status alone.
  const updateRes = await supabase
    .from('articles')
    .update({ status: 'draft' })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (updateRes.error) {
    if (updateRes.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown', message: updateRes.error.message };
  }
  revalidateArticleSurfaces(updateRes.data.slug);
  return { ok: true, id: updateRes.data.id, slug: updateRes.data.slug };
}

export async function deleteArticleAction(id: string): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;

  // Capture cover path first so we can sweep storage after the row is gone.
  const { data: existing } = await supabase
    .from('articles')
    .select('id, slug, cover_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existing) return { ok: false, code: 'not_found' };

  const delRes = await supabase.from('articles').delete().eq('id', id);
  if (delRes.error) return { ok: false, code: 'unknown', message: delRes.error.message };

  if (existing.cover_image_path) {
    await supabase.storage.from(ARTICLE_COVERS_BUCKET).remove([existing.cover_image_path]);
  }

  revalidateArticleSurfaces(existing.slug);
  redirect('/app/admin/cms/articles');
}

export async function uploadCoverImageAction(formData: FormData): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase, userId } = guard;

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { ok: false, code: 'not_found' };
  const file = formData.get('cover');
  if (!(file instanceof Blob)) return { ok: false, code: 'invalid_cover' };

  // Allow PNG or JPEG. MIME is the cheap first check; magic-byte sniff is the
  // real gate (clients can spoof Content-Type trivially, and a `image/png`
  // header on an SVG-with-script is the classic XSS trap).
  let extension: 'png' | 'jpg';
  let contentType: 'image/png' | 'image/jpeg';
  if (file.type === 'image/png') {
    if (!(await isPng(file))) return { ok: false, code: 'invalid_cover' };
    extension = 'png';
    contentType = 'image/png';
  } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    if (!(await isJpeg(file))) return { ok: false, code: 'invalid_cover' };
    extension = 'jpg';
    contentType = 'image/jpeg';
  } else {
    return { ok: false, code: 'invalid_cover' };
  }

  if (file.size === 0 || file.size > ARTICLE_COVER_MAX_BYTES) {
    return { ok: false, code: 'invalid_cover' };
  }

  const existingRes = await supabase
    .from('articles')
    .select('id, slug, cover_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existingRes.data) return { ok: false, code: 'not_found' };

  const path = `${userId}/${id}.${extension}`;
  const uploadRes = await supabase.storage
    .from(ARTICLE_COVERS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '0', contentType });
  if (uploadRes.error) {
    return { ok: false, code: 'unknown', message: uploadRes.error.message };
  }

  // If the previous cover lived at a different extension, sweep it so the
  // bucket doesn't accumulate stale copies (one article should have at most
  // one cover object).
  const previousPath = existingRes.data.cover_image_path;
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(ARTICLE_COVERS_BUCKET).remove([previousPath]);
  }

  const update = await supabase
    .from('articles')
    .update({ cover_image_path: path })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (update.error) return { ok: false, code: 'unknown', message: update.error.message };

  revalidateArticleSurfaces(update.data.slug);
  return { ok: true, id: update.data.id, slug: update.data.slug };
}

export async function removeCoverImageAction(id: string): Promise<ArticleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;

  const existingRes = await supabase
    .from('articles')
    .select('id, slug, cover_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existingRes.data) return { ok: false, code: 'not_found' };

  if (existingRes.data.cover_image_path) {
    await supabase.storage.from(ARTICLE_COVERS_BUCKET).remove([existingRes.data.cover_image_path]);
  }

  const update = await supabase
    .from('articles')
    .update({ cover_image_path: null })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (update.error) return { ok: false, code: 'unknown', message: update.error.message };

  revalidateArticleSurfaces(update.data.slug);
  return { ok: true, id: update.data.id, slug: update.data.slug };
}
