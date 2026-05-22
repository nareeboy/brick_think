import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';

import { getCoverPublicUrl } from './storage';
import type {
  ArticleDetail,
  ArticleListItem,
  PublishedArticleDetail,
  PublishedArticleSummary,
} from './types';

const ROW_WITH_AUTHOR = `
  id,
  slug,
  title,
  excerpt,
  body_markdown,
  cover_image_path,
  status,
  published_at,
  author_profile_id,
  created_at,
  updated_at,
  author:author_profile_id (full_name, email)
`;

interface JoinedRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  cover_image_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  author_profile_id: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string | null; email: string | null } | null;
}

function authorDisplay(author: JoinedRow['author']): string | null {
  if (!author) return null;
  return author.full_name?.trim() || author.email || null;
}

function toDetail(
  client: ReturnType<typeof createServerSupabaseClient> extends Promise<infer C> ? C : never,
  row: JoinedRow,
): ArticleDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown,
    coverImagePath: row.cover_image_path,
    coverImageUrl: getCoverPublicUrl(client, row.cover_image_path),
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    authorProfileId: row.author_profile_id,
    authorName: authorDisplay(row.author),
  };
}

export async function listArticlesForAdmin(): Promise<ArticleListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(ROW_WITH_AUTHOR)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to load articles: ${error.message}`);
  return ((data ?? []) as unknown as JoinedRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    authorName: authorDisplay(row.author),
  }));
}

export async function getArticleByIdForAdmin(id: string): Promise<ArticleDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(ROW_WITH_AUTHOR)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load article: ${error.message}`);
  if (!data) return null;
  return toDetail(supabase, data as unknown as JoinedRow);
}

export async function listPublishedArticles(): Promise<PublishedArticleSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(ROW_WITH_AUTHOR)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw new Error(`Failed to load published articles: ${error.message}`);
  return ((data ?? []) as unknown as JoinedRow[])
    .filter((row) => row.published_at !== null)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedAt: row.published_at as string,
      coverImageUrl: getCoverPublicUrl(supabase, row.cover_image_path),
      authorName: authorDisplay(row.author),
    }));
}

export async function getPublishedArticleBySlug(
  slug: string,
): Promise<PublishedArticleDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(ROW_WITH_AUTHOR)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`Failed to load article: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as JoinedRow;
  if (row.published_at === null) return null;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyMarkdown: row.body_markdown,
    coverImageUrl: getCoverPublicUrl(supabase, row.cover_image_path),
    publishedAt: row.published_at,
    authorName: authorDisplay(row.author),
  };
}
