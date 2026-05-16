'use client';

import { useState, useTransition } from 'react';

import { updateProfileAction, type UpdateProfileResult } from './actions';

interface Props {
  initialFullName: string | null;
  email: string;
}

export function AccountForm({ initialFullName, email }: Props) {
  const [name, setName] = useState(initialFullName ?? '');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();
  const baseline = initialFullName ?? '';
  const dirty = name !== baseline;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    start(async () => {
      try {
        const result: UpdateProfileResult = await updateProfileAction(name);
        if (result.kind === 'ok') {
          setFeedback({ kind: 'ok', text: 'Saved.' });
        } else {
          setFeedback({ kind: 'error', text: result.reason });
        }
      } catch (e) {
        setFeedback({
          kind: 'error',
          text: e instanceof Error ? e.message : 'Failed to save',
        });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Email
        </span>
        <input
          type="email"
          value={email}
          readOnly
          disabled
          aria-label="Email"
          data-testid="account-email"
          className="h-10 cursor-not-allowed rounded-xl border border-zinc-900/10 bg-[#FBF7F1] px-3 text-[14px] text-zinc-700"
        />
        <span className="text-[12px] text-zinc-500">
          Sign in with a different provider to change your email.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Display name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFeedback(null);
          }}
          placeholder="What should the app call you?"
          maxLength={80}
          aria-label="Display name"
          data-testid="account-name-input"
          className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#c0613d]"
        />
        <span className="text-[12px] text-zinc-500">
          Shown in the header and on shared sessions. Leave blank to fall back to your email.
        </span>
      </label>

      {feedback ? (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          data-testid="account-feedback"
          className={`rounded-xl px-3 py-2 text-[13px] ${
            feedback.kind === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={pending || !dirty}
          data-testid="account-save"
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
