import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

import { lookupAuthorConfig } from './authors';
import { getCoverPublicUrl } from './storage';
import type {
  ArticleDetail,
  ArticleListItem,
  PublishedArticleDetail,
  PublishedArticleSummary,
} from './types';

const COVER_CREDIT_COLS = `cover_credit_name, cover_credit_url, cover_credit_source, cover_credit_source_url`;

const ROW_WITH_AUTHOR = `
  id,
  slug,
  title,
  excerpt,
  body_html,
  cover_image_path,
  ${COVER_CREDIT_COLS},
  status,
  published_at,
  author_profile_id,
  created_at,
  updated_at,
  author:author_profile_id (full_name, email, avatar_url)
`;

// Same shape minus body_html — used by the public list query.
const PUBLIC_ROW = `
  id,
  slug,
  title,
  excerpt,
  cover_image_path,
  ${COVER_CREDIT_COLS},
  status,
  published_at,
  author_profile_id
`;

interface CoverCreditCols {
  cover_credit_name: string | null;
  cover_credit_url: string | null;
  cover_credit_source: string | null;
  cover_credit_source_url: string | null;
}

interface JoinedRow extends CoverCreditCols {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string;
  cover_image_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  author_profile_id: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

function coverCreditFrom(row: CoverCreditCols) {
  return {
    name: row.cover_credit_name ?? null,
    url: row.cover_credit_url ?? null,
    source: row.cover_credit_source ?? null,
    sourceUrl: row.cover_credit_source_url ?? null,
  };
}

function authorDisplay(author: JoinedRow['author']): string | null {
  if (!author) return null;
  return author.full_name?.trim() || author.email || null;
}

interface PublicAuthor {
  name: string | null;
  avatarUrl: string | null;
  tagline: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
}

// Public anon callers cannot read `profiles` (RLS restricts SELECT to
// authenticated org-mates / session-participants). The article author is
// genuinely public info though — name + avatar shown beneath the headline.
// We escalate to the service role for this narrow lookup, deliberately
// selecting only the columns the byline needs (full_name, avatar_url) plus
// email — email is used solely as the lookup key for the ARTICLE_AUTHORS byline
// config (see lib/articles/authors.ts) and never leaves this function. Profile
// ids without a row resolve to nulls.
async function loadPublicAuthors(
  profileIds: readonly string[],
): Promise<Map<string, PublicAuthor>> {
  const unique = Array.from(new Set(profileIds.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();
  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .in('id', unique);
  if (error) throw new Error(`Failed to load article authors: ${error.message}`);
  const map = new Map<string, PublicAuthor>();
  for (const row of data ?? []) {
    const name = row.full_name?.trim() || null;
    const config = lookupAuthorConfig(row.email);
    map.set(row.id, {
      name,
      avatarUrl: row.avatar_url ?? null,
      tagline: config?.tagline ?? null,
      linkedinUrl: config?.linkedinUrl ?? null,
      portfolioUrl: config?.portfolioUrl ?? null,
    });
  }
  return map;
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
    bodyHtml: row.body_html,
    coverImagePath: row.cover_image_path,
    coverImageUrl: getCoverPublicUrl(client, row.cover_image_path),
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    authorProfileId: row.author_profile_id,
    authorName: authorDisplay(row.author),
    coverCredit: coverCreditFrom(row),
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

interface PublicListRow extends CoverCreditCols {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_path: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  author_profile_id: string | null;
}

export async function listPublishedArticles(): Promise<PublishedArticleSummary[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(PUBLIC_ROW)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw new Error(`Failed to load published articles: ${error.message}`);
  const rows = ((data ?? []) as unknown as PublicListRow[]).filter(
    (row) => row.published_at !== null,
  );
  const authors = await loadPublicAuthors(
    rows.map((r) => r.author_profile_id).filter((id): id is string => Boolean(id)),
  );
  return rows.map((row) => {
    const a = row.author_profile_id ? authors.get(row.author_profile_id) : undefined;
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      publishedAt: row.published_at as string,
      coverImageUrl: getCoverPublicUrl(supabase, row.cover_image_path),
      authorName: a?.name ?? null,
      authorAvatarUrl: a?.avatarUrl ?? null,
      authorTagline: a?.tagline ?? null,
      authorLinkedinUrl: a?.linkedinUrl ?? null,
      authorPortfolioUrl: a?.portfolioUrl ?? null,
    };
  });
}

interface PublicDetailRow extends PublicListRow {
  body_html: string;
}

export async function getPublishedArticleBySlug(
  slug: string,
): Promise<PublishedArticleDetail | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('articles')
    .select(`${PUBLIC_ROW}, body_html`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`Failed to load article: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as PublicDetailRow;
  if (row.published_at === null) return null;
  const authors = row.author_profile_id
    ? await loadPublicAuthors([row.author_profile_id])
    : new Map<string, PublicAuthor>();
  const a = row.author_profile_id ? authors.get(row.author_profile_id) : undefined;
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyHtml: row.body_html,
    coverImageUrl: getCoverPublicUrl(supabase, row.cover_image_path),
    publishedAt: row.published_at,
    authorName: a?.name ?? null,
    authorAvatarUrl: a?.avatarUrl ?? null,
    authorTagline: a?.tagline ?? null,
    authorLinkedinUrl: a?.linkedinUrl ?? null,
    authorPortfolioUrl: a?.portfolioUrl ?? null,
    coverCredit: coverCreditFrom(row),
  };
}
