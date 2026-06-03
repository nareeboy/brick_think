import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, MarketingShell } from '@/components/marketing/MarketingChrome';
import { formatPublishedDate, isoDate } from '@/lib/articles/format';
import { listPublishedArticles } from '@/lib/articles/queries';
import type { PublishedArticleSummary } from '@/lib/articles/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Articles',
  description:
    'Field notes on LEGO® SERIOUS PLAY®, remote facilitation, and how BrickThink is built — in the open, with care.',
};

export default async function ArticlesIndexPage() {
  const articles = await listPublishedArticles();
  const [featured, ...rest] = articles;

  return (
    <MarketingShell>
      <Hero count={articles.length} />
      {featured ? <Featured article={featured} /> : <Empty />}
      {rest.length > 0 ? <Archive articles={rest} /> : null}
    </MarketingShell>
  );
}

function Hero({ count }: { count: number }) {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-20 md:grid-cols-12 md:items-end md:gap-12 md:pb-20 md:pt-28">
        <div className="md:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Field notes
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            Notes from the
            <br />
            <span className="text-[#c0613d]">workshop floor</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            Short pieces on LEGO® SERIOUS PLAY®, remote facilitation, and how this product is built. No
            growth hacks. No SEO loops. Just things we&apos;ve learned and want to share.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Pieces
              </dt>
              <dd className="mt-1 font-display text-[20px] font-medium tracking-tight text-zinc-950 tabular-nums">
                {count.toString().padStart(2, '0')}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Cadence
              </dt>
              <dd className="mt-1 font-display text-[20px] font-medium tracking-tight text-zinc-950">
                When we have something
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Tone
              </dt>
              <dd className="mt-1 font-display text-[20px] font-medium tracking-tight text-zinc-950">
                Plain, not pitched
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Cost
              </dt>
              <dd className="mt-1 font-display text-[20px] font-medium tracking-tight text-zinc-950">
                Free, forever
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function Featured({ article }: { article: PublishedArticleSummary }) {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:items-center md:gap-14 md:py-24">
        <Link
          href={`/articles/${article.slug}`}
          className="group block md:col-span-7"
          aria-label={`Read: ${article.title}`}
        >
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase storage host stays off next/image domains
            <img
              src={article.coverImageUrl}
              alt=""
              className="aspect-[16/10] w-full rounded-2xl object-cover shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
            />
          ) : (
            <CoverFallback />
          )}
        </Link>
        <div className="md:col-span-5">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Latest
            <span aria-hidden="true">·</span>
            <time dateTime={isoDate(article.publishedAt)}>
              {formatPublishedDate(article.publishedAt)}
            </time>
          </div>
          <h2 className="mt-4 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950 md:text-[44px]">
            <Link
              href={`/articles/${article.slug}`}
              className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[length:100%_1px]"
            >
              {article.title}
            </Link>
          </h2>
          {article.excerpt ? (
            <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-zinc-700">
              {article.excerpt}
            </p>
          ) : null}
          <div className="mt-7 flex items-center gap-4 text-[13px] text-zinc-600">
            {article.authorName ? <span>{article.authorName}</span> : null}
            <Link
              href={`/articles/${article.slug}`}
              className="inline-flex items-center gap-1.5 font-medium text-zinc-900 transition-colors hover:text-[#c0613d]"
            >
              Read it
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Archive({ articles }: { articles: PublishedArticleSummary[] }) {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mb-10 flex items-baseline justify-between gap-6">
          <h2 className="font-display text-[28px] font-medium tracking-tight text-zinc-950 md:text-[36px]">
            Earlier
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {articles.length} {articles.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
        <ul className="divide-y divide-zinc-900/10 border-y border-zinc-900/10">
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/articles/${article.slug}`}
                className="group grid grid-cols-1 gap-3 py-6 md:grid-cols-12 md:items-center md:gap-8"
              >
                <div className="md:col-span-2 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  <time dateTime={isoDate(article.publishedAt)}>
                    {formatPublishedDate(article.publishedAt)}
                  </time>
                </div>
                <div className="md:col-span-7">
                  <h3 className="font-display text-[22px] font-medium leading-snug tracking-tight text-zinc-950 transition-colors group-hover:text-[#c0613d]">
                    {article.title}
                  </h3>
                  {article.excerpt ? (
                    <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-zinc-600">
                      {article.excerpt}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-3 md:text-right text-[13px] text-zinc-600">
                  <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-[#c0613d]">
                    Read
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Empty() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Empty stack
        </div>
        <h2 className="mt-6 font-display text-[40px] font-medium leading-tight tracking-tight text-zinc-950 md:text-[52px]">
          Nothing here yet.
        </h2>
        <p className="mt-5 text-[16px] leading-relaxed text-zinc-600">
          The first piece is being written. Check back soon, or follow the work on{' '}
          <a
            href="https://github.com/nareeboy/brick_think"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c0613d] underline underline-offset-4 hover:text-[#9a4a2c]"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function CoverFallback() {
  // A quiet brick-pattern panel that stands in for a missing cover image,
  // tinted with the brand colour so the layout stays grounded.
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,#FBE6D8_0%,#F5D1B8_45%,#E7B289_100%)] shadow-[0_30px_60px_-30px_rgba(192,97,61,0.45)]">
      <div className="grid h-full grid-cols-6 gap-3 p-6 opacity-80">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="rounded-md bg-[#c0613d]/15"
            style={{ aspectRatio: '2 / 1' }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
