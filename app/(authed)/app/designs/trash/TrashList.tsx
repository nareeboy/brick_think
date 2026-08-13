'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import type { TrashedModelSummary } from '@/lib/models/types';

import { emptyTrashAction, purgeModelAction, restoreModelAction } from '../actions';

interface TrashListProps {
  items: Array<TrashedModelSummary & { daysRemainingLabel: string }>;
}

export function TrashList({ items }: TrashListProps) {
  const [pendingEmpty, startEmpty] = useTransition();
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-900/15 p-8 text-center">
        <p className="text-[13px] text-zinc-500">Trash is empty.</p>
        {/* WCAG 1.4.3 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 on white */}
        <p className="mt-2 text-[12px] text-zinc-500">
          Designs you delete will appear here for 30 days before being permanently removed.
        </p>
        <Link
          href="/app/designs"
          className="mt-4 inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Back to designs
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-zinc-600">
          Items here are deleted automatically after 30 days. Restore at any time before then.
        </p>
        <button
          type="button"
          onClick={() => setConfirmingEmpty(true)}
          disabled={pendingEmpty}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
        >
          Empty trash
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <TrashCard key={item.id} item={item} />
        ))}
      </ul>

      {confirmingEmpty ? (
        <DeleteConfirmDialog
          title="Empty trash?"
          description={
            <>
              Permanently delete all {items.length} design{items.length === 1 ? '' : 's'} in trash?
              This cannot be undone.
            </>
          }
          confirmLabel="Empty trash"
          confirmPendingLabel="Emptying…"
          pending={pendingEmpty}
          onCancel={() => setConfirmingEmpty(false)}
          onConfirm={() =>
            startEmpty(async () => {
              await emptyTrashAction();
              setConfirmingEmpty(false);
            })
          }
        />
      ) : null}
    </>
  );
}

function TrashCard({ item }: { item: TrashedModelSummary & { daysRemainingLabel: string } }) {
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [pendingRestore, startRestore] = useTransition();
  const [pendingPurge, startPurge] = useTransition();

  return (
    <li className="relative rounded-2xl border border-zinc-900/10 bg-white p-4">
      <p className="truncate text-[15px] font-semibold text-zinc-950">{item.title}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {item.daysRemainingLabel}
      </p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            startRestore(async () => {
              await restoreModelAction(item.id);
            })
          }
          disabled={pendingRestore || pendingPurge}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-xl bg-zinc-900 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {pendingRestore ? 'Restoring…' : 'Restore'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingPurge(true)}
          disabled={pendingRestore || pendingPurge}
          className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {confirmingPurge ? (
        <DeleteConfirmDialog
          title="Delete this design?"
          description={
            <>
              Permanently delete &ldquo;{item.title}&rdquo;? Versions and history will be lost. This
              cannot be undone.
            </>
          }
          pending={pendingPurge}
          onCancel={() => setConfirmingPurge(false)}
          onConfirm={() =>
            startPurge(async () => {
              await purgeModelAction(item.id);
              setConfirmingPurge(false);
            })
          }
        />
      ) : null}
    </li>
  );
}
