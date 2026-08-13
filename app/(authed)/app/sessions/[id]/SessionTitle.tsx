'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { renameSession } from '../actions';
import { PencilIcon } from '@/components/icons';

const MAX_LENGTH = 200;

export function SessionTitle({
  sessionId,
  initialTitle,
  canRename,
}: {
  sessionId: string;
  initialTitle: string;
  canRename: boolean;
}) {
  // Optimistic local title — server is the source of truth on next page load.
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  function startEditing() {
    if (!canRename) return;
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim().slice(0, MAX_LENGTH);
    setEditing(false);
    if (!trimmed || trimmed === title) {
      setDraft(title);
      return;
    }
    setTitle(trimmed);
    startTransition(() => {
      void renameSession(sessionId, trimmed).catch(() => {
        // Revert optimistic update if the action throws.
        setTitle(initialTitle);
      });
    });
  }

  function cancel() {
    setDraft(title);
    setEditing(false);
  }

  if (!canRename) {
    return (
      <h1
        className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-950"
        data-testid="session-title"
      >
        {title}
      </h1>
    );
  }

  return (
    <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-950">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={MAX_LENGTH}
          aria-label="Session title"
          data-testid="session-title-input"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          autoComplete="off"
          className="-mx-1.5 w-[calc(100%+0.75rem)] rounded-md border border-[#a8482a]/40 bg-[#a8482a]/5 px-1.5 py-0.5 text-[26px] font-semibold leading-tight tracking-tight text-zinc-950 outline-none focus:border-[#a8482a]"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          disabled={pending}
          title="Rename session"
          aria-label="Rename session"
          data-testid="session-title"
          className="group -mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-70"
        >
          <span className="truncate">{title}</span>
          <PencilIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600" />
        </button>
      )}
    </h1>
  );
}
