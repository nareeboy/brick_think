import Link from 'next/link';

import { listArticlesForAdmin } from '@/lib/articles/queries';

import { ArticleStatusPill } from './ArticleStatusPill';
import { DeleteArticleButton } from './DeleteArticleButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Articles · Admin · BrickThink' };

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function ArticlesIndexPage() {
  const articles = await listArticlesForAdmin();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">CMS</div>
          <h1 className="font-serif text-3xl tracking-tight text-zinc-900">Articles</h1>
          <p className="text-[14px] text-zinc-600">
            Drafts stay invisible to the public until you publish. Published articles are readable
            by anyone, signed in or not.
          </p>
        </div>
        <Link
          href="/app/admin/cms/articles/new"
          className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-zinc-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800"
        >
          New article
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center">
          <p className="font-serif text-lg text-zinc-900">No articles yet</p>
          <p className="mt-1 text-[13px] text-zinc-600">
            Create your first article — drafts are safe, only published ones go public.
          </p>
          <Link
            href="/app/admin/cms/articles/new"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-zinc-900 px-4 text-[13px] font-medium text-white hover:bg-zinc-800"
          >
            New article
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-zinc-900/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {articles.map((article) => (
            <li
              key={article.id}
              data-scroll-target
              className="group relative flex items-center gap-4 border-b border-zinc-900/5 px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/app/admin/cms/articles/${article.id}`}
                  className="group/title block rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="truncate font-serif text-[18px] text-zinc-900 group-hover/title:underline">
                      {article.title}
                    </span>
                    <ArticleStatusPill status={article.status} />
                  </div>
                  <div className="mt-1 truncate text-[12px] text-zinc-500">
                    /{article.slug} · {article.authorName ?? 'Unknown author'} · updated{' '}
                    {formatRelative(article.updatedAt)}
                  </div>
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <Link
                  href={`/app/admin/cms/articles/${article.id}`}
                  className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Edit
                </Link>
                <DeleteArticleButton id={article.id} title={article.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
