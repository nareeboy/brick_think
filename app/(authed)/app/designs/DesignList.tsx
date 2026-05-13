'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { ModelSummary, OrgModelSummary } from '@/lib/models/types';

import { deleteModelAction } from './actions';

type AnyCardModel = ModelSummary | OrgModelSummary;

interface Props {
  models: AnyCardModel[];
  viewerProfileId: string;
}

export function DesignList({ models, viewerProfileId }: Props) {
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
        <DesignCard key={m.id} model={m} viewerProfileId={viewerProfileId} />
      ))}
    </ul>
  );
}

function isOrgModel(m: AnyCardModel): m is OrgModelSummary {
  return 'owner_profile_id' in m;
}

function DesignCard({
  model,
  viewerProfileId,
}: {
  model: AnyCardModel;
  viewerProfileId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const trashButtonRef = useRef<HTMLButtonElement>(null);

  const updated = new Date(model.updated_at);
  const updatedLabel = updated.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const orgModel = isOrgModel(model) ? model : null;
  const isOwner = orgModel ? orgModel.owner_profile_id === viewerProfileId : true;
  const ownerLabel = orgModel
    ? orgModel.owner_full_name ?? orgModel.owner_email
    : null;

  function closeAndRestoreFocus() {
    setConfirming(false);
    // Defer until after React commits so the trash button is mounted again.
    queueMicrotask(() => trashButtonRef.current?.focus());
  }

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
        {ownerLabel ? (
          <p className="mt-2 truncate text-[12px] text-zinc-600">
            by {ownerLabel}
            {!isOwner ? (
              <span className="ml-2 inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                view only
              </span>
            ) : null}
          </p>
        ) : null}
      </Link>
      {isOwner ? (
        <button
          ref={trashButtonRef}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${model.title}`}
          className="absolute right-2 top-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all hover:bg-zinc-900/5 hover:text-zinc-700 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : null}

      {confirming ? (
        <DeleteConfirmDialog
          modelId={model.id}
          modelTitle={model.title}
          pending={pending}
          onCancel={closeAndRestoreFocus}
          onConfirm={() =>
            start(async () => {
              await deleteModelAction(model.id);
              // The card unmounts after revalidatePath, so no focus restore.
              setConfirming(false);
            })
          }
        />
      ) : null}
    </li>
  );
}

function DeleteConfirmDialog({
  modelTitle,
  pending,
  onCancel,
  onConfirm,
}: {
  modelId: string;
  modelTitle: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  // Focus the Cancel button on open — safer default than focusing Delete.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Escape closes; basic two-button focus trap so Tab cannot leave the dialog.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const active = document.activeElement;
      if (!e.shiftKey && active === deleteRef.current) {
        e.preventDefault();
        cancelRef.current?.focus();
      } else if (e.shiftKey && active === cancelRef.current) {
        e.preventDefault();
        deleteRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-zinc-900/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="text-[16px] font-semibold text-zinc-950">
          Delete this design?
        </h2>
        <p id={descId} className="mt-2 text-[13px] leading-relaxed text-zinc-600">
          &ldquo;{modelTitle}&rdquo; moves to Trash. You can restore it within 30 days.
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Cancel
          </button>
          <button
            ref={deleteRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
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
