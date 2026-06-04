// app/(authed)/app/admin/changelog/page.tsx
import Link from 'next/link';

import { formatChangelogDate } from '@/lib/changelog/format';
import { listEntriesForAdmin } from '@/lib/changelog/queries';

import { CategoryBadge } from './CategoryBadge';
import { ChangelogStatusPill } from './ChangelogStatusPill';

export const dynamic = 'force-dynamic';

export default async function AdminChangelogPage() {
  const entries = await listEntriesForAdmin();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-zinc-950">Changelog</h1>
        <Link
          href="/app/admin/changelog/new"
          className="inline-flex cursor-pointer items-center rounded-md bg-[#c0613d] px-4 py-2 text-sm font-medium text-white hover:bg-[#a8512f]"
        >
          New entry
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-zinc-600">No entries yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-900/10 border-y border-zinc-900/10">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/app/admin/changelog/${e.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:bg-zinc-900/[0.02]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryBadge category={e.category} />
                  <span className="truncate font-medium text-zinc-900">{e.title}</span>
                  {e.versionTag ? (
                    <span className="font-mono text-xs text-zinc-500">{e.versionTag}</span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-500">
                  {e.publishedAt ? <span>{formatChangelogDate(e.publishedAt)}</span> : null}
                  <ChangelogStatusPill status={e.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
