'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import type { ModelSummary } from '@/lib/models/types';

import { deleteModelAction } from './actions';

export function DesignList({ models }: { models: ModelSummary[] }) {
  if (models.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center text-[13px] text-zinc-500">
        No designs yet. Click &ldquo;New design&rdquo; to start.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((m) => (
        <DesignCard key={m.id} model={m} />
      ))}
    </ul>
  );
}

function DesignCard({ model }: { model: ModelSummary }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const updated = new Date(model.updated_at);
  const updatedLabel = updated.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <li className="group relative rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:bg-[#FAF7F1]">
      <Link
        href={`/app/designs/${model.id}`}
        className="block"
        aria-label={`Open ${model.title}`}
      >
        <p className="truncate text-[15px] font-semibold text-zinc-950">{model.title}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Updated {updatedLabel}
        </p>
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${model.title}`}
        className="absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all hover:bg-zinc-900/5 hover:text-zinc-700 group-hover:opacity-100"
      >
        <TrashIcon className="h-4 w-4" />
      </button>

      {confirming ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirming(false)}
            className="absolute inset-0 cursor-default bg-zinc-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            <h2 className="text-[16px] font-semibold text-zinc-950">Delete this design?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
              &ldquo;{model.title}&rdquo; will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    await deleteModelAction(model.id);
                    setConfirming(false);
                  })
                }
                disabled={pending}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
              >
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 17.5 20a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 6" />
    </svg>
  );
}
