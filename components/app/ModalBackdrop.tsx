'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { useFocusTrap } from '@/lib/a11y/useFocusTrap';

// Shared modal backdrop. Wraps the panel children in a fixed-position layer,
// renders a backdrop button (interactive — sidesteps the
// jsx-a11y/click-events-have-key-events and -no-noninteractive-element-interactions
// lints that the older div-with-onClick pattern needed to suppress), and
// wires Escape-to-close at the window level so keyboard users get parity.
//
// Consumers own:
//   * the inner panel sizing/shape (the `<div class="w-full max-w-md rounded-2xl bg-white p-6 ...">`
//     stays in the consumer because each dialog has its own width / colouring).
//   * focusing the first input on mount (the consumer has the ref).
//   * Tab cycling is now handled universally by useFocusTrap — no per-dialog
//     implementation needed.

interface Props {
  onClose: () => void;
  /** id of the heading element used by the panel — wired through aria-labelledby. */
  titleId?: string;
  /** Alternative to titleId when there's no visible heading element to point at. */
  ariaLabel?: string;
  dataTestid?: string;
  /** Override the default panel-width wrapper. Defaults to `w-full max-w-md`. */
  panelClassName?: string;
  children: ReactNode;
}

export function ModalBackdrop({
  onClose,
  titleId,
  ariaLabel,
  dataTestid,
  panelClassName = 'w-full max-w-md',
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      data-testid={dataTestid}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : ariaLabel}
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div className={`relative ${panelClassName}`}>{children}</div>
    </div>
  );
}
