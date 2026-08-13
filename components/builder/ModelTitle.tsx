'use client';

import { useEffect, useRef, useState } from 'react';

import { useBuilderState } from './builderState';
import { PencilIcon } from '@/components/icons';

const MAX_LENGTH = 200;

export function ModelTitle() {
  const { title, setTitle, readOnly } = useBuilderState();
  const [draft, setDraft] = useState(title);
  const [editing, setEditing] = useState(false);
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

  useEffect(() => {
    // No cleanup: when the builder unmounts, Next.js applies the destination
    // route's metadata title. Restoring a captured "previous" value races with
    // that update and leaves stale "<model> · Builder" titles on list pages.
    document.title = `${title} · Builder · BrickThink`;
  }, [title]);

  function startEditing() {
    setDraft(title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim().slice(0, MAX_LENGTH);
    if (trimmed && trimmed !== title) setTitle(trimmed);
    setEditing(false);
  }

  function cancel() {
    setDraft(title);
    setEditing(false);
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Model</p>
      {readOnly ? (
        <p className="-mx-1.5 mt-1 px-1.5 py-0.5 text-[22px] font-semibold tracking-tight text-zinc-950 truncate">
          {title}
        </p>
      ) : editing ? (
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
          className="mt-1 w-full rounded-md border border-[#a8482a]/40 bg-[#a8482a]/5 px-1.5 py-0.5 text-[22px] font-semibold tracking-tight text-zinc-950 outline-none focus:border-[#a8482a]"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          title="Rename model"
          aria-label="Rename model"
          data-tour-id="model-title-edit"
          className="group -mx-1.5 mt-1 flex w-[calc(100%+0.75rem)] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[22px] font-semibold tracking-tight text-zinc-950 hover:bg-zinc-900/5"
        >
          <span className="truncate">{title}</span>
          <PencilIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600" />
        </button>
      )}
    </div>
  );
}
