'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { renameOrgAction, type RenameOrgResult } from '@/app/(authed)/app/workshops/actions';

interface Props {
  orgId: string;
  initialName: string;
}

export function RenameOrgForm({ orgId, initialName }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function cancel() {
    setName(initialName);
    setError(null);
    setEditing(false);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError('Name must be 1–80 characters.');
      return;
    }
    if (trimmed === initialName) {
      setEditing(false);
      return;
    }
    start(async () => {
      const result: RenameOrgResult = await renameOrgAction(orgId, trimmed);
      if (result.kind === 'ok') {
        setEditing(false);
        router.refresh();
        return;
      }
      if (result.kind === 'invalid_input') {
        setError('Name must be 1–80 characters.');
        return;
      }
      if (result.kind === 'forbidden') {
        setError("You don't have permission to rename this workshop.");
        return;
      }
      if (result.kind === 'not_found') {
        setError('This workshop no longer exists.');
        return;
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group -mx-1 inline-flex max-w-full cursor-pointer items-baseline gap-2 rounded-md px-1 text-left transition-colors hover:bg-zinc-900/5"
        title="Rename workshop"
      >
        <span className="truncate text-[26px] font-semibold tracking-tight text-zinc-950">
          {initialName}
        </span>
        {/* WCAG 1.4.3 — was text-zinc-400 (2.56:1 when revealed), bumped to text-zinc-500 for 4.83:1 on white */}
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
          Edit
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          disabled={pending}
          aria-label="Workshop name"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-900/10 bg-white px-3 text-[20px] font-semibold tracking-tight text-zinc-950 outline-none focus:border-[#c0613d] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-md px-3 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
