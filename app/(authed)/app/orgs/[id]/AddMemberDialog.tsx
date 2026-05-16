'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { addOrgMemberAction, type AddMemberResult } from '@/app/(authed)/app/orgs/actions';

interface Props {
  orgId: string;
  onClose: () => void;
}

export function AddMemberDialog({ orgId, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
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
    const trimmed = email.trim();
    if (trimmed.length === 0) return;
    setFeedback(null);
    start(async () => {
      const result: AddMemberResult = await addOrgMemberAction(orgId, trimmed);
      if (result.kind === 'ok') {
        setEmail('');
        setFeedback({ kind: 'ok', text: 'Member added.' });
        return;
      }
      if (result.kind === 'invalid_input') {
        setFeedback({ kind: 'error', text: 'Please enter an email address.' });
        return;
      }
      if (result.kind === 'unknown_email') {
        setFeedback({
          kind: 'error',
          text: 'No account for that email yet. Ask them to sign in once first.',
        });
        return;
      }
      if (result.kind === 'already_member') {
        setFeedback({ kind: 'error', text: 'They are already a member.' });
        return;
      }
      if (result.kind === 'forbidden') {
        setFeedback({ kind: 'error', text: 'Only admins can add members.' });
      }
    });
  }

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      data-testid="add-member-dialog"
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
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Add a member
        </h2>
        <p className="mt-1 text-[13px] text-zinc-600">
          They must have signed in once before they can be added.
        </p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Add by email
          </span>
          <input
            ref={inputRef}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-3 text-[14px] text-zinc-900 outline-none focus:border-[#c0613d]"
          />
        </label>

        {feedback ? (
          <p
            role="status"
            className={`mt-3 rounded-xl px-3 py-2 text-[13px] ${
              feedback.kind === 'ok'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
