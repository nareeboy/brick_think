'use client';

import { useEffect, useRef } from 'react';

import { updateFacilitatorNotesAction } from '@/app/(authed)/app/sessions/notes-actions';
import { useFocusTrap } from '@/lib/a11y/useFocusTrap';
import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';

import { NotesEditor } from './NotesEditor';

interface Props {
  sessionId: string;
  initialValue: string | null;
  open: boolean;
  onClose: () => void;
}

// Right-edge slide-out drawer for facilitator notes. ModalBackdrop centres its
// panel, which doesn't fit a right-anchored drawer — so we hand-roll the
// overlay while reusing the same a11y primitives (useFocusTrap for Tab
// cycling, window-level Escape, role/aria-modal, motion-preference gating).
export function FacilitatorNotesDrawer({ sessionId, initialValue, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = (document.activeElement as HTMLElement | null) ?? null;
    // Defer focus until after the panel is rendered so the textarea actually
    // exists in the DOM when we reach for it.
    const id = window.setTimeout(() => {
      const node = dialogRef.current?.querySelector('textarea');
      if (node instanceof HTMLTextAreaElement) {
        textareaRef.current = node;
        node.focus();
      }
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    // Restore focus to the trigger when the drawer closes so keyboard users
    // don't lose their place.
    const node = lastFocused.current;
    if (node && typeof node.focus === 'function') node.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Facilitator notes"
      className="fixed inset-0 z-40"
    >
      <button
        type="button"
        aria-label="Close notes"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-900/30"
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl ${
          reducedMotion ? '' : 'motion-safe:animate-in motion-safe:slide-in-from-right'
        }`}
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Private notes</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
          >
            ✕
          </button>
        </header>
        <div className="p-4">
          <NotesEditor
            initialValue={initialValue}
            onSave={(value) => updateFacilitatorNotesAction(sessionId, value)}
            ariaLabel="Facilitator notes"
          />
        </div>
      </div>
    </div>
  );
}
