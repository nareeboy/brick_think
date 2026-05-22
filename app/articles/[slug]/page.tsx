import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArticleProse } from '@/components/articles/ArticleProse';
import { ArrowRight, CtaBricks, MarketingShell } from '@/components/marketing/MarketingChrome';
import { formatPublishedDate, isoDate, readingMinutes } from '@/lib/articles/format';
import { getPublishedArticleBySlug } from '@/lib/articles/queries';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return { title: 'Article not found' };
  return {
    title: article.title,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: article.authorName ? [article.authorName] : undefined,
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
    twitter: {
      card: article.coverImageUrl ? 'summary_large_image' : 'summary',
      title: article.title,
      description: article.excerpt ?? undefined,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const minutes = readingMinutes(article.bodyMarkdown);

  return (
    <MarketingShell>
      <article>
        <Header article={article} minutes={minutes} />
        {article.coverImageUrl ? <Cover url={article.coverImageUrl} alt={article.title} /> : null}
        <Body markdown={article.bodyMarkdown} />
        <Outro />
      </article>
    </MarketingShell>
  );
}

interface HeaderArticle {
  title: string;
  excerpt: string | null;
  publishedAt: string;
  authorName: string | null;
}

function Header({ article, minutes }: { article: HeaderArticle; minutes: number }) {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:pb-16 md:pt-24">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-600 transition-colors hover:text-[#c0613d]"
        >
          <ArrowRight className="h-3 w-3 rotate-180" />
          All articles
        </Link>
        <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-12 md:items-end md:gap-12">
          <div className="md:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
              Article
            </div>
            <h1 className="mt-6 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950 sm:text-[52px] md:text-[68px]">
              {article.title}
            </h1>
            {article.excerpt ? (
              <p className="mt-7 max-w-[58ch] text-[18px] leading-relaxed text-zinc-700">
                {article.excerpt}
              </p>
            ) : null}
          </div>
          <aside className="md:col-span-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Published
                </dt>
                <dd className="mt-1 font-display text-[18px] font-medium tracking-tight text-zinc-950">
                  <time dateTime={isoDate(article.publishedAt)}>
                    {formatPublishedDate(article.publishedAt)}
                  </time>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Read
                </dt>
                <dd className="mt-1 font-display text-[18px] font-medium tracking-tight text-zinc-950 tabular-nums">
                  {minutes} min
                </dd>
              </div>
              {article.authorName ? (
                <div className="col-span-2">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    By
                  </dt>
                  <dd className="mt-1 font-display text-[18px] font-medium tracking-tight text-zinc-950">
                    {article.authorName}
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Cover({ url, alt }: { url: string; alt: string }) {
  return (
    <section className="border-b border-zinc-900/5 bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase storage host stays off next/image domains */}
        <img
          src={url}
          alt={alt}
          className="aspect-[16/9] w-full rounded-2xl object-cover shadow-[0_40px_80px_-30px_rgba(0,0,0,0.3)]"
        />
      </div>
    </section>
  );
}

function Body({ markdown }: { markdown: string }) {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <ArticleProse markdown={markdown} />
      </div>
    </section>
  );
}

function Outro() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        {/*
          The bricks scene from MarketingChrome positions its children
          `absolute inset-0` against the nearest positioned ancestor. It MUST
          live inside a sized, relatively-positioned panel — otherwise the
          bricks escape upward and overlay article content. Same containment
          pattern as `CtaBand` on /about.
        */}
        <div className="relative overflow-hidden rounded-[32px] border border-zinc-900/10 bg-gradient-to-br from-[#FBF7F1] to-[#F2E8D8] p-8 md:p-14">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <CtaBricks />
          </div>
          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
              Keep going
            </div>
            <h2 className="mt-4 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              More field notes.
            </h2>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-zinc-700">
              Read the rest of the writing, or take BrickThink for a spin — it&apos;s open source
              and free.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/articles"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                All articles
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Try BrickThink
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
