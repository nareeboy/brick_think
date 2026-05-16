'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { createSession } from '@/app/(authed)/app/sessions/actions';

interface Props {
  orgId: string;
  onClose: () => void;
}

export function NewSessionDialog({ orgId, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (title.trim().length === 0) {
      setError('Title is required');
      return;
    }
    setError(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set('title', title.trim());
        fd.set('orgId', orgId);
        await createSession(fd);
        // createSession redirects on success; we won't reach here.
      } catch (e) {
        const digest = (e as { digest?: string })?.digest;
        if (digest?.startsWith('NEXT_REDIRECT')) throw e;
        setError(e instanceof Error ? e.message : 'Failed to create');
      }
    });
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      data-testid="new-session-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        data-testid="new-session-form"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          New session
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          Give this session a title. You can rename it later.
        </p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Session title
          </span>
          <input
            ref={inputRef}
            type="text"
            data-testid="new-session-title"
            placeholder="e.g. Q3 strategy retro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#c0613d]"
          />
        </label>

        {error ? (
          <p data-testid="new-session-error" role="alert" className="mt-3 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="new-session-submit"
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Creating…' : 'Create session'}
          </button>
        </div>
      </form>
    </div>
  );
}
