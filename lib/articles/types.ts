import type { Database } from '@/lib/db/types.generated';

export type ArticleStatus = Database['public']['Enums']['article_status'];

export type ArticleRow = Database['public']['Tables']['articles']['Row'];

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string | null;
}

export interface CoverCredit {
  name: string | null;
  url: string | null;
  source: string | null;
  sourceUrl: string | null;
}

export interface ArticleDetail extends ArticleListItem {
  bodyHtml: string;
  coverImagePath: string | null;
  coverImageUrl: string | null;
  authorProfileId: string | null;
  createdAt: string;
  coverCredit: CoverCredit;
}

export interface PublishedArticleSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  coverImageUrl: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorTagline: string | null;
  authorLinkedinUrl: string | null;
  authorPortfolioUrl: string | null;
}

export interface PublishedArticleDetail extends PublishedArticleSummary {
  bodyHtml: string;
  coverCredit: CoverCredit;
}
