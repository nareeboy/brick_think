'use client';

import { useTransition } from 'react';

import { createSession } from '../actions';

export function CreateSessionForm({ canCreate }: { canCreate: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd: FormData) => {
        startTransition(() => {
          void createSession(fd);
        });
      }}
      className="mt-6 flex flex-col gap-3"
    >
      <label htmlFor="title" className="text-[13px] font-medium text-zinc-800">
        Session title
      </label>
      <input
        id="title"
        name="title"
        type="text"
        required
        maxLength={200}
        defaultValue="New session"
        disabled={!canCreate || pending}
        data-testid="session-title-input"
        className="rounded-xl border border-zinc-900/10 bg-white px-3 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900/30 focus-visible:ring-2 focus-visible:ring-[#c0613d]/40 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
      />
      <p className="text-[12px] leading-snug text-zinc-500">
        The five Serious Play stages will be added automatically. You can rename the session
        afterwards.
      </p>
      <div className="mt-2">
        <button
          type="submit"
          disabled={!canCreate || pending}
          data-testid="create-session-submit"
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create session'}
        </button>
      </div>
    </form>
  );
}
