import type { MetadataRoute } from 'next';

import { listPublishedArticles } from '@/lib/articles/queries';
import { listOpenRoles } from '@/lib/careers/queries';
import { absoluteUrl } from '@/lib/seo/site';

// Built per-request: the article/career queries need Supabase request context,
// so this route is dynamic rather than statically generated at build time.
export const dynamic = 'force-dynamic';

// Public marketing routes that always exist. Tuned changeFrequency/priority
// per page; the home page leads, evergreen legal pages trail.
const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/facilitators', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/what-is-lsp', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/self-host', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/compare/miro', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/articles', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/careers', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/roadmap', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/changelog', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/help', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: absoluteUrl(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Dynamic content is best-effort: a Supabase hiccup must not 500 the whole
  // sitemap and drop the static routes with it.
  const [articles, roles] = await Promise.all([
    listPublishedArticles().catch(() => []),
    listOpenRoles().catch(() => []),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: absoluteUrl(`/articles/${a.slug}`),
    lastModified: a.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const roleEntries: MetadataRoute.Sitemap = roles.map((r) => ({
    url: absoluteUrl(`/careers/${r.slug}`),
    lastModified: r.createdAt,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticEntries, ...articleEntries, ...roleEntries];
}
