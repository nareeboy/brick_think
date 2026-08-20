'use client';

import { useState, useTransition } from 'react';

import { createExampleWorkshopAction } from './example-workshop-actions';

const ERROR_COPY: Record<string, string> = {
  unauthenticated: 'You are signed out — sign in again and retry.',
  seed_failed: "We couldn't build the example just now — try again in a moment.",
};

// Seeds (or reopens) the caller's example workshop: a finished workshop with
// models, transcripts and rooms, so someone can see what one looks like
// before running their own. Open to every signed-in user; the action decides
// between seeding and reopening, so this only needs to know which verb to
// show. Seeding writes a lot of rows and takes a second or two — hence the
// explicit pending label rather than a bare spinner.
export function ExampleWorkshopButton({ hasExample }: { hasExample: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects (never returns); only failures land here.
      const result = await createExampleWorkshopAction();
      setError(ERROR_COPY[result.code] ?? 'Something went wrong.');
    });
  };

  const idleLabel = hasExample ? 'Open example workshop' : 'See an example workshop';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        data-testid="example-workshop-button"
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/15 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Building your example…' : idleLabel}
      </button>
      {error ? (
        <p role="alert" className="text-[11px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
