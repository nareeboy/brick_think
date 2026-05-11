'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_NAME = 'BT0317';
const MAX_LENGTH = 32;

export function ModelTitle() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [draft, setDraft] = useState(DEFAULT_NAME);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(name);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) setName(trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Model</p>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={MAX_LENGTH}
          aria-label="Model name"
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
          className="mt-1 w-full rounded-md border border-[#c0613d]/40 bg-[#c0613d]/5 px-1.5 py-0.5 text-[22px] font-semibold tracking-tight text-zinc-950 outline-none focus:border-[#c0613d]"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          title="Rename model"
          aria-label="Rename model"
          className="group -mx-1.5 mt-1 flex w-[calc(100%+0.75rem)] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[22px] font-semibold tracking-tight text-zinc-950 hover:bg-zinc-900/5"
        >
          <span className="truncate">{name}</span>
          <PencilIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600" />
        </button>
      )}

      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Stage 03 · Shared model
      </p>
    </div>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
