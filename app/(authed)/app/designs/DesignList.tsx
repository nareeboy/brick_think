'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
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
        <div
          data-testid="design-thumb"
          className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-zinc-900/5 bg-[#FBF7F1]"
        >
          {model.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- deliberate per plan: Supabase signed URLs bypass next/image
            <img
              src={model.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <DotGridPlaceholder />
          )}
        </div>
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
          title="Delete this design?"
          description={
            <>
              &ldquo;{model.title}&rdquo; moves to Trash. You can restore it within 30 days.
            </>
          }
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

function DotGridPlaceholder() {
  return (
    <div
      aria-hidden="true"
      data-testid="design-thumb-placeholder"
      className="absolute inset-0"
      style={{
        backgroundImage: 'radial-gradient(rgba(60,30,15,0.10) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    />
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
