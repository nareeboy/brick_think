'use client';

import { useId, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { deleteAccountAction, type DeleteAccountResult } from './actions';

interface Props {
  email: string;
}

export function DangerZone({ email }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<DeleteAccountResult | null>(null);
  const [pending, start] = useTransition();
  const titleId = useId();

  function reset() {
    setConfirming(false);
    setTyped('');
    setError(null);
    setBlocked(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBlocked(null);
    start(async () => {
      try {
        const result = await deleteAccountAction(typed);
        if (result.kind === 'invalid_input') {
          setError(result.reason);
          return;
        }
        if (result.kind === 'blocked') {
          setBlocked(result);
          return;
        }
        // 'ok' won't reach here — the action redirects.
      } catch (err) {
        // NEXT_REDIRECT throws are the success path; let them bubble.
        if (
          err instanceof Error &&
          'digest' in err &&
          typeof (err as { digest?: unknown }).digest === 'string' &&
          (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
          throw err;
        }
        setError(err instanceof Error ? err.message : 'Could not delete account.');
      }
    });
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-semibold tracking-tight text-red-900">Delete account</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">
          Removes your sign-in credentials, your personal designs, and any workshops you own alone.
          Sessions you facilitated in someone else&rsquo;s org stay there, with your name shown as
          &ldquo;Former facilitator&rdquo;. This action cannot be undone.
        </p>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          data-testid="account-delete-trigger"
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          Delete account
        </button>
      </div>

      {confirming ? (
        <ModalBackdrop titleId={titleId} onClose={reset}>
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
          >
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-red-900">
                Delete your account?
              </h2>
              <p className="text-[12px] leading-relaxed text-red-900/80">
                This permanently removes your sign-in, your personal designs, and any sole-owner
                workshops. There is no recovery.
              </p>
            </div>

            {blocked && blocked.kind === 'blocked' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                <p className="font-semibold">Resolve these first:</p>
                <ul className="mt-1 list-disc pl-4">
                  {blocked.reasons.map((row) => (
                    <li key={row.id}>
                      <a
                        href={`/app/workshops/${row.id}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {row.name}
                      </a>{' '}
                      — transfer ownership or remove other members
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-900/70">
                Type <span className="text-red-900">{email}</span> to confirm
              </span>
              <input
                type="email"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={pending}
                autoComplete="off"
                aria-label={`Type ${email} to confirm deletion`}
                data-testid="account-delete-confirm-input"
                className="h-10 rounded-xl border border-red-200 bg-white px-3 font-mono text-[13px] text-zinc-900 outline-none focus:border-red-500 disabled:opacity-60"
              />
            </label>

            {error ? (
              <p role="alert" className="text-[12px] font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-900/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || typed.trim().length === 0}
                data-testid="account-delete-confirm"
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-red-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </form>
        </ModalBackdrop>
      ) : null}
    </section>
  );
}
