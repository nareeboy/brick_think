'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { deleteModelAction } from '@/app/(authed)/app/designs/actions';
import type { AggregateDesignRow } from '@/lib/my-designs/types';

interface Props {
  designs: AggregateDesignRow[];
}

export function DesignList({ designs }: Props) {
  if (designs.length === 0) {
    return (
      <p
        data-testid="my-designs-empty"
        className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center text-[13px] text-zinc-500"
      >
        No designs yet. Click &ldquo;New design&rdquo; to start.
      </p>
    );
  }

  return (
    <ul
      data-testid="my-designs-list"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {designs.map((d) => (
        <DesignCard key={d.id} design={d} />
      ))}
    </ul>
  );
}

function DesignCard({ design }: { design: AggregateDesignRow }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const trashButtonRef = useRef<HTMLButtonElement>(null);

  const updated = new Date(design.updated_at);
  const updatedLabel = updated.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function closeAndRestoreFocus() {
    setConfirming(false);
    queueMicrotask(() => trashButtonRef.current?.focus());
  }

  // Only personal designs can be trashed (RLS on soft-delete refuses
  // session-scoped rows by design — see 20260514120000_session_designs.sql).
  const canTrash = design.badge.kind === 'personal';

  return (
    <li
      data-testid={`design-card-${design.id}`}
      className="group relative rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:bg-[#FAF7F1]"
    >
      <Link
        href={`/app/designs/${design.id}`}
        className="block"
        aria-label={`Open ${design.title}`}
      >
        <div
          data-testid="design-thumb"
          className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl border border-zinc-900/5 bg-[#FBF7F1]"
        >
          {design.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs bypass next/image
            <img
              src={design.thumbnail_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <DotGridPlaceholder />
          )}
        </div>
        <p className="truncate text-[15px] font-semibold text-zinc-950">{design.title}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Updated {updatedLabel}
        </p>
        <Badge badge={design.badge} />
      </Link>
      {canTrash ? (
        <button
          ref={trashButtonRef}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${design.title}`}
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
              &ldquo;{design.title}&rdquo; moves to Trash. You can restore it within 30 days.
            </>
          }
          pending={pending}
          onCancel={closeAndRestoreFocus}
          onConfirm={() =>
            start(async () => {
              await deleteModelAction(design.id);
              setConfirming(false);
            })
          }
        />
      ) : null}
    </li>
  );
}

function Badge({ badge }: { badge: AggregateDesignRow['badge'] }) {
  if (badge.kind === 'personal') {
    return (
      <p
        data-testid="design-badge"
        className="mt-2 inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600"
      >
        Personal
      </p>
    );
  }
  return (
    <p
      data-testid="design-badge"
      className="mt-2 truncate text-[12px] text-zinc-600"
    >
      <Link
        href={`/app/orgs/${badge.orgId}`}
        className="underline-offset-2 hover:underline"
      >
        {badge.orgName}
      </Link>
      <span aria-hidden="true" className="mx-1.5 text-zinc-400">·</span>
      <Link
        href={`/app/sessions/${badge.sessionId}`}
        className="underline-offset-2 hover:underline"
      >
        {badge.sessionTitle}
      </Link>
    </p>
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
