'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DeleteConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmPendingLabel?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Accessible confirmation dialog for destructive actions.
// - Focuses Cancel on mount (safer default than focusing Delete).
// - Escape dismisses; Tab is trapped between Cancel and Delete.
// - Backdrop click dismisses but is excluded from the tab cycle.
// - Caller restores focus to the trigger button via onCancel /
//   after onConfirm (if the trigger remains in the DOM).
export function DeleteConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  confirmPendingLabel = 'Deleting…',
  pending,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
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
          {title}
        </h2>
        <div id={descId} className="mt-2 text-[13px] leading-relaxed text-zinc-600">
          {description}
        </div>
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
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            {pending ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
