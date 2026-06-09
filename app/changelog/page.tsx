// app/changelog/page.tsx
import type { Metadata } from 'next';

import { CategoryBadge } from '@/app/(authed)/app/admin/changelog/CategoryBadge';
import { MarketingShell } from '@/components/marketing/MarketingChrome';
import { sanitizeChangelogHtml } from '@/lib/changelog/sanitizeHtml';
import { formatChangelogDate, groupByMonth, isoDate } from '@/lib/changelog/format';
import { listPublishedEntries } from '@/lib/changelog/queries';
import type { PublicChangelogEntry } from '@/lib/changelog/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What’s new in BrickThink — features, improvements, and fixes.',
};

export default async function ChangelogPage() {
  const entries = await listPublishedEntries();
  const groups = groupByMonth(entries);

  return (
    <MarketingShell>
      <section className="border-b border-zinc-900/5">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-20 md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            Changelog
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[72px]">
            What&apos;s <span className="text-[#a8482a]">new</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            Every release, fix, and improvement to BrickThink — newest first.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        {groups.length === 0 ? (
          <p className="text-zinc-600">Nothing here yet — check back soon.</p>
        ) : (
          <div className="space-y-16">
            {groups.map((group) => (
              <div key={group.monthLabel}>
                <h2 className="mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  {group.monthLabel}
                </h2>
                <div className="space-y-12">
                  {group.entries.map((entry) => (
                    <EntryBlock key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </MarketingShell>
  );
}

function EntryBlock({ entry }: { entry: PublicChangelogEntry }) {
  return (
    <article className="border-t border-zinc-900/10 pt-8 first:border-t-0 first:pt-0">
      {entry.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase storage host kept off next.config image domains
        <img
          src={entry.bannerUrl}
          alt={`Banner for ${entry.title}`}
          className="mb-6 aspect-[3/1] w-full rounded-2xl object-cover ring-1 ring-zinc-900/5"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge category={entry.category} />
        {entry.versionTag ? (
          <span className="font-mono text-xs text-zinc-500">{entry.versionTag}</span>
        ) : null}
        <time dateTime={isoDate(entry.publishedAt)} className="text-xs text-zinc-500">
          {formatChangelogDate(entry.publishedAt)}
        </time>
      </div>
      <h3 className="mt-3 font-display text-2xl font-medium leading-snug text-zinc-950">
        {entry.title}
      </h3>
      {entry.bodyHtml ? (
        // Stored value is sanitized on save; re-sanitize on render as defense in
        // depth (and to neutralize any legacy rows).
        <div
          className="article-prose mt-4"
          dangerouslySetInnerHTML={{ __html: sanitizeChangelogHtml(entry.bodyHtml) }}
        />
      ) : null}
    </article>
  );
}
