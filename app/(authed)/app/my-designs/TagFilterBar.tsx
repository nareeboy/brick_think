'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
  tags: string[];
  active: string | null;
}

export function TagFilterBar({ tags, active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, start] = useTransition();

  function pick(next: string | null) {
    start(() => {
      const params = new URLSearchParams(searchParams ?? undefined);
      if (next === null) params.delete('tag');
      else params.set('tag', next);
      const qs = params.toString();
      router.push(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
    });
  }

  return (
    <div
      data-testid="my-designs-tag-bar"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-[13px] font-medium text-zinc-600">Tags:</span>
      <button
        type="button"
        onClick={() => pick(null)}
        aria-pressed={active === null}
        className={`inline-flex h-7 cursor-pointer items-center rounded-full border px-3 text-[12px] font-medium transition-colors ${
          active === null
            ? 'border-[#c0613d] bg-[#c0613d] text-white'
            : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const on = active === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => pick(on ? null : tag)}
            aria-pressed={on}
            data-testid={`tag-chip-${tag}`}
            className={`inline-flex h-7 cursor-pointer items-center rounded-full border px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
              on
                ? 'border-[#c0613d] bg-[#c0613d] text-white'
                : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
            }`}
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}
