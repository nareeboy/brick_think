'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  page: number;
  pageSize: number;
  totalCount: number;
}

export function PaginationControls({ page, pageSize, totalCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstIndex = (page - 1) * pageSize + 1;
  const lastIndex = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function goto(next: number) {
    start(() => {
      const params = new URLSearchParams(searchParams ?? undefined);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      const qs = params.toString();
      router.push(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
    });
  }

  return (
    <nav
      aria-label="Pagination"
      data-testid="my-designs-pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {firstIndex}–{lastIndex} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goto(page - 1)}
          disabled={!hasPrev || pending}
          data-testid="my-designs-page-prev"
          className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-900/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Newer
        </button>
        <span
          aria-live="polite"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500"
        >
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goto(page + 1)}
          disabled={!hasNext || pending}
          data-testid="my-designs-page-next"
          className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-900/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Older →
        </button>
      </div>
    </nav>
  );
}
