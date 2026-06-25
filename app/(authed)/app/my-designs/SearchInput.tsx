'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

const DEBOUNCE_MS = 250;

interface Props {
  initialValue: string;
  inputId?: string;
}

export function SearchInput({ initialValue, inputId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const [, start] = useTransition();
  const timerRef = useRef<number | null>(null);
  const initialSnapshotRef = useRef(initialValue);

  // Keep local state in sync if the URL changes from elsewhere (e.g. clear-all).
  useEffect(() => {
    if (initialValue !== initialSnapshotRef.current) {
      initialSnapshotRef.current = initialValue;
      setValue(initialValue);
    }
  }, [initialValue]);

  function push(nextRaw: string) {
    const next = nextRaw.trim();
    const params = new URLSearchParams(searchParams ?? undefined);
    if (next.length === 0) params.delete('q');
    else params.set('q', next);
    params.delete('page');
    const qs = params.toString();
    start(() => {
      router.push(qs ? `/app/my-designs?${qs}` : '/app/my-designs');
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => push(next), DEBOUNCE_MS);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    push(value);
  }

  function clear() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setValue('');
    push('');
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full max-w-md">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={onChange}
        placeholder="Search designs by title"
        aria-label="Search designs by title"
        data-testid="my-designs-search"
        autoComplete="off"
        className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white pl-9 pr-9 text-[13px] text-zinc-900 placeholder:text-zinc-500 transition-colors focus:border-[#a8482a] focus:outline-none"
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          data-testid="my-designs-search-clear"
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700"
        >
          <ClearIcon className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </form>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClearIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
