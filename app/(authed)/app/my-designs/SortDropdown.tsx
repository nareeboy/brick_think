'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { MyDesignsSort } from '@/lib/my-designs/types';
import { serializeSort, sortLabel } from '@/lib/my-designs/types';

interface Props {
  value: MyDesignsSort;
  buttonId?: string;
}

const OPTIONS: MyDesignsSort[] = ['newest', 'oldest', 'title-asc', 'title-desc'];

export function SortDropdown({ value, buttonId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      window.addEventListener('mousedown', onClick);
      window.addEventListener('keydown', onKey);
      firstOptionRef.current?.focus();
    }
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(next: MyDesignsSort) {
    start(() => {
      const params = new URLSearchParams(searchParams ?? undefined);
      if (next === 'newest') params.delete('sort');
      else params.set('sort', serializeSort(next));
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
      setOpen(false);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={pending}
        data-testid="my-designs-sort-button"
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
      >
        <span>{sortLabel(value)}</span>
        <ChevronIcon />
      </button>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Sort designs"
          className="absolute left-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          {OPTIONS.map((opt, i) => (
            <SortItem
              key={opt}
              label={sortLabel(opt)}
              active={value === opt}
              onSelect={() => pick(opt)}
              buttonRef={i === 0 ? firstOptionRef : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortItem({
  label,
  active,
  onSelect,
  buttonRef,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#FAF7F1] ${
        active ? 'bg-[#FAF7F1]' : ''
      }`}
    >
      <span className="text-[13px] font-semibold text-zinc-900">{label}</span>
      {active ? <CheckIcon /> : null}
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4 text-[#a8482a]"
      aria-hidden="true"
    >
      <path d="m5 13 4 4 10-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
