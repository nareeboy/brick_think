'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { serializeTagList } from '@/lib/my-designs/types';

import { ManageTagsDialog } from './ManageTagsDialog';

interface Props {
  tags: string[];
  active: string[];
}

export function TagFilterBar({ tags, active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, start] = useTransition();
  const [managing, setManaging] = useState(false);
  const activeSet = new Set(active);

  function push(next: string[]) {
    start(() => {
      const params = new URLSearchParams(searchParams ?? undefined);
      if (next.length === 0) params.delete('tag');
      else params.set('tag', serializeTagList(next));
      const qs = params.toString();
      router.push(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
    });
  }

  function toggle(tag: string) {
    const next = activeSet.has(tag) ? active.filter((t) => t !== tag) : [...active, tag];
    push(next);
  }

  function clear() {
    push([]);
  }

  return (
    <div
      data-testid="my-designs-tag-bar"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-[13px] font-medium text-zinc-600">Tags:</span>
      <button
        type="button"
        onClick={clear}
        aria-pressed={active.length === 0}
        className={`inline-flex h-7 cursor-pointer items-center rounded-full border px-3 text-[12px] font-medium transition-colors ${
          active.length === 0
            ? 'border-[#c0613d] bg-[#c0613d] text-white'
            : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
        }`}
      >
        All
      </button>
      {tags.map((tag) => {
        const on = activeSet.has(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
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
      {active.length > 1 ? (
        <span
          aria-live="polite"
          className="ml-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
        >
          AND ({active.length})
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setManaging(true)}
        data-testid="manage-tags-button"
        className="ml-auto inline-flex h-7 cursor-pointer items-center rounded-full border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
      >
        Manage
      </button>
      {managing ? (
        <ManageTagsDialog tags={tags} onClose={() => setManaging(false)} />
      ) : null}
    </div>
  );
}
