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
import { ARTICLE_COVERS_BUCKET } from '@/lib/articles/storage';
import { createServerSupabaseClient } from '@/lib/db/server';
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
}

async function requireAdmin(): Promise<{ supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string } | ArticleActionResult> {
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
  return null;
}

function readInput(formData: FormData): ArticleInput {
  const id = formData.get('id');
  const titleRaw = formData.get('title');
  const slugRaw = formData.get('slug');
  const excerptRaw = formData.get('excerpt');
  const bodyRaw = formData.get('body');
  const title = typeof titleRaw === 'string' ? titleRaw : '';
  let slug = typeof slugRaw === 'string' ? slugRaw.trim() : '';
  if (!slug && title) slug = slugify(title);
  return {
    id: typeof id === 'string' && id ? id : undefined,
    title,
    slug,
    excerpt: typeof excerptRaw === 'string' ? excerptRaw.trim() : '',
    bodyMarkdown: typeof bodyRaw === 'string' ? bodyRaw : '',
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

  const updateRes = await supabase
    .from('articles')
    .update({
      title: input.title.trim(),
      slug: input.slug,
      excerpt: input.excerpt.length === 0 ? null : input.excerpt,
      body_markdown: input.bodyMarkdown,
    })
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
  if (file.type !== 'image/png') return { ok: false, code: 'invalid_cover' };
  if (file.size === 0 || file.size > ARTICLE_COVER_MAX_BYTES) {
    return { ok: false, code: 'invalid_cover' };
  }
  if (!(await isPng(file))) return { ok: false, code: 'invalid_cover' };

  const existingRes = await supabase
    .from('articles')
    .select('id, slug, cover_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existingRes.data) return { ok: false, code: 'not_found' };

  const path = `${userId}/${id}.png`;
  const uploadRes = await supabase.storage
    .from(ARTICLE_COVERS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '0', contentType: 'image/png' });
  if (uploadRes.error) {
    return { ok: false, code: 'unknown', message: uploadRes.error.message };
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
    await supabase.storage
      .from(ARTICLE_COVERS_BUCKET)
      .remove([existingRes.data.cover_image_path]);
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
