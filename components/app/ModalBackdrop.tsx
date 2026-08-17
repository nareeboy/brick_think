'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

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
  /** id of the description element — wired through aria-describedby. */
  descriptionId?: string;
  dataTestid?: string;
  /** Override the default panel-width wrapper. Defaults to `w-full max-w-md`. */
  panelClassName?: string;
  /**
   * Override the fixed overlay layout. Defaults to a centered modal; pass
   * e.g. `fixed inset-0 z-40 flex justify-end` (with a full-height
   * panelClassName) for a side-drawer dialog.
   */
  containerClassName?: string;
  /**
   * Whether clicking the dimmed backdrop closes the dialog (default). Pass
   * false for deliberate-choice dialogs (e.g. the onboarding welcome) where a
   * stray click shouldn't dismiss; Escape and explicit buttons still close.
   */
  backdropCloses?: boolean;
  children: ReactNode;
}

export function ModalBackdrop({
  onClose,
  titleId,
  ariaLabel,
  descriptionId,
  dataTestid,
  panelClassName = 'w-full max-w-md',
  containerClassName = 'fixed inset-0 z-40 flex items-center justify-center px-4',
  backdropCloses = true,
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

  // Render into document.body so the fixed z-40 layer lives in the root
  // stacking context. Rendered inline, the dialog would be trapped inside any
  // ancestor that establishes a stacking context (e.g. PageBanner's
  // `isolation: isolate`), letting later-in-tree page content paint over it.
  // Modals are open-gated client-side, so document is always present here; the
  // guard only covers a defensive SSR render.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      data-testid={dataTestid}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-label={titleId ? undefined : ariaLabel}
      aria-describedby={descriptionId}
      className={containerClassName}
    >
      {backdropCloses ? (
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          onClick={onClose}
          data-testid={dataTestid ? `${dataTestid}-backdrop` : undefined}
          className="absolute inset-0 cursor-default bg-black/40"
        />
      ) : (
        <div
          aria-hidden="true"
          data-testid={dataTestid ? `${dataTestid}-backdrop` : undefined}
          className="absolute inset-0 bg-black/40"
        />
      )}
      <div className={`relative ${panelClassName}`}>{children}</div>
    </div>,
    document.body,
  );
}
