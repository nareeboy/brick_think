'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { deleteOrgAction, type DeleteOrgResult } from '@/app/(authed)/app/orgs/actions';

interface Props {
  orgId: string;
  orgName: string;
  orgSlug: string;
}

export function DeleteOrgButton({ orgId, orgName, orgSlug }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (confirming) inputRef.current?.focus();
  }, [confirming]);

  function reset() {
    setConfirming(false);
    setTyped('');
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (typed.trim() !== orgSlug) {
      setError(`Type "${orgSlug}" to confirm.`);
      return;
    }
    start(async () => {
      const result: DeleteOrgResult = await deleteOrgAction(orgId);
      if (result.kind === 'ok') {
        router.push('/app/orgs');
        router.refresh();
        return;
      }
      if (result.kind === 'forbidden') {
        setError('Only the owner can delete this organisation.');
        return;
      }
      if (result.kind === 'not_found') {
        router.push('/app/orgs');
        router.refresh();
        return;
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-red-200 px-3 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete organisation
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-semibold text-red-900">
          Delete &ldquo;{orgName}&rdquo;?
        </p>
        <p className="text-[12px] leading-relaxed text-red-900/80">
          This permanently removes the organisation, all its members, and any
          sessions owned by it. Designs created here will move back to their
          authors&rsquo; personal context. This action cannot be undone.
        </p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-900/70">
          Type <span className="text-red-900">{orgSlug}</span> to confirm
        </span>
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={pending}
          autoComplete="off"
          aria-label={`Type ${orgSlug} to confirm deletion`}
          className="h-10 rounded-xl border border-red-200 bg-white px-3 font-mono text-[13px] text-zinc-900 outline-none focus:border-red-500 disabled:opacity-60"
        />
      </label>
      {error ? (
        <p role="alert" className="text-[12px] font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
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
          disabled={pending || typed.trim() !== orgSlug}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-red-600 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Delete organisation'}
        </button>
      </div>
    </form>
  );
}
