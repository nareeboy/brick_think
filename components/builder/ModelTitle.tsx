'use client';

import { useEffect, useRef, useState } from 'react';

import { useBuilderState, useRelativeTime } from './builderState';

const DEFAULT_NAME = 'BT0317';
const MAX_LENGTH = 32;

export function ModelTitle() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [draft, setDraft] = useState(DEFAULT_NAME);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { savedAt, hasSavedVersion, rollback } = useBuilderState();
  const relativeSaved = useRelativeTime(savedAt);

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

  function handleRollbackConfirm() {
    rollback();
    setConfirmOpen(false);
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

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {hasSavedVersion && relativeSaved
            ? `Saved ${relativeSaved}`
            : 'Unsaved · new build'}
        </p>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!hasSavedVersion}
          aria-label="Roll back to last saved version"
          title={
            hasSavedVersion
              ? 'Roll back to last saved version'
              : 'Save the build first to enable rollback'
          }
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-[#c0613d]/10 hover:text-[#c0613d] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
        >
          <RollbackIcon className="h-4 w-4" />
        </button>
      </div>

      {confirmOpen ? (
        <RollbackConfirmModal
          savedRelative={relativeSaved}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleRollbackConfirm}
        />
      ) : null}
    </div>
  );
}

function RollbackConfirmModal({
  savedRelative,
  onCancel,
  onConfirm,
}: {
  savedRelative: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rollback-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-zinc-900/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#c0613d]/12 text-[#c0613d]">
            <RollbackIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 id="rollback-title" className="text-[16px] font-semibold text-zinc-950">
              Roll back this build?
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {savedRelative ? `Saved ${savedRelative}` : 'Last saved version'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-zinc-600">
          Any changes made since the last save will be discarded and the canvas will return to the
          last saved version.
        </p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
          >
            Roll back
          </button>
        </div>
      </div>
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

function RollbackIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7v6h6" />
      <path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7" />
    </svg>
  );
}
