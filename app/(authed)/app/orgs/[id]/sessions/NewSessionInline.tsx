'use client';

import { useState, useTransition } from 'react';

import { createSession } from '@/app/(authed)/app/sessions/actions';

export function NewSessionInline({ orgId }: { orgId: string }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      data-testid="new-session-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim().length === 0) {
          setError('Title is required');
          return;
        }
        start(async () => {
          try {
            const fd = new FormData();
            fd.set('title', title.trim());
            fd.set('orgId', orgId);
            await createSession(fd);
            // createSession redirects on success; we won't reach here.
          } catch (e) {
            // NEXT_REDIRECT throw = success. Re-throw it so Next can perform
            // the redirect. Anything else surfaces as an inline error.
            const digest = (e as { digest?: string })?.digest;
            if (digest?.startsWith('NEXT_REDIRECT')) {
              throw e;
            }
            setError(e instanceof Error ? e.message : 'Failed to create');
          }
        });
      }}
      className="flex items-center gap-2 rounded-2xl border border-zinc-900/10 bg-white p-3"
    >
      <input
        type="text"
        data-testid="new-session-title"
        placeholder="New session title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="flex-1 rounded-md border border-zinc-900/10 px-3 py-2 text-[14px]"
      />
      <button
        type="submit"
        data-testid="new-session-submit"
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white hover:bg-[#cf6e47] disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create session'}
      </button>
      {error ? (
        <p data-testid="new-session-error" className="text-[12px] text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
