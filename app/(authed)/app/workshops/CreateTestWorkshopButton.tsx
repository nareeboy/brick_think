'use client';

import { useState, useTransition } from 'react';

import { createTestWorkshopAction } from './test-workshop-actions';

const ERROR_COPY: Record<string, string> = {
  unauthenticated: 'You are signed out — sign in again and retry.',
  not_site_admin: 'Only site admins can create test workshops.',
  seed_failed: 'Seeding failed — check the server logs.',
};

// Site-admin-only helper next to "New workshop": one click seeds a fully
// completed workshop (stages, models, transcripts) for exercising the paid
// post-session features. The page only renders it for site admins; the
// action re-checks server-side.
export function CreateTestWorkshopButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects (never returns); only failures land here.
      const result = await createTestWorkshopAction();
      setError(ERROR_COPY[result.code] ?? 'Something went wrong.');
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        data-testid="create-test-workshop-button"
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/15 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Creating test workshop…' : 'Create test workshop'}
      </button>
      {error ? (
        <p role="alert" className="text-[11px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
