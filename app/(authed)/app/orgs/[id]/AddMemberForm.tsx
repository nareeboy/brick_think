'use client';

import { useState, useTransition } from 'react';

import { addOrgMemberAction, type AddMemberResult } from '@/app/(authed)/app/orgs/actions';

interface Props {
  orgId: string;
}

export function AddMemberForm({ orgId }: Props) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const trimmed = email.trim();
    if (trimmed.length === 0) return;
    start(async () => {
      const result: AddMemberResult = await addOrgMemberAction(orgId, trimmed);
      if (result.kind === 'ok') {
        setEmail('');
        setFeedback({ kind: 'ok', text: 'Member added.' });
      } else if (result.kind === 'invalid_input') {
        setFeedback({ kind: 'error', text: 'Please enter an email address.' });
      } else if (result.kind === 'unknown_email') {
        setFeedback({
          kind: 'error',
          text: 'No account for that email yet. Ask them to sign in once first.',
        });
      } else if (result.kind === 'already_member') {
        setFeedback({ kind: 'error', text: 'They are already a member.' });
      } else if (result.kind === 'forbidden') {
        setFeedback({ kind: 'error', text: 'Only admins can add members.' });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Add by email
        </span>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="h-10 flex-1 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#c0613d]"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </label>
      {feedback ? (
        <p
          role="status"
          className={`rounded-xl px-3 py-2 text-[13px] ${
            feedback.kind === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
