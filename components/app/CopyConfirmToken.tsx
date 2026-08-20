'use client';

import { useEffect, useRef, useState } from 'react';

import { CheckIcon, CopyIcon } from '@/components/icons';

// How long the tick stays up after a successful copy.
export const COPIED_RESET_MS = 3000;

interface CopyConfirmTokenProps {
  /** The exact phrase the dialog expects — shown verbatim and copied verbatim. */
  value: string;
  /** `danger` tints the chip for the red destructive-confirm modals. */
  tone?: 'danger' | 'neutral';
  className?: string;
  dataTestid?: string;
}

const TONE_CLASSES: Record<'danger' | 'neutral', string> = {
  danger: 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100',
  neutral: 'border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100',
};

// The confirm phrase in a type-to-confirm dialog, rendered as a click-to-copy
// chip (see DeleteOrgButton / DangerZone / admin AccountRowActions). Typing a
// slug or an email by hand is the tedious part of these dialogs, so the phrase
// itself is the copy affordance: click it, the glyph flips to a tick for
// COPIED_RESET_MS, and the phrase can be pasted straight into the input.
//
// The chip deliberately renders in `normal-case` with normal tracking: the
// surrounding labels are uppercase + letter-spaced, and what you see must be
// exactly what lands on the clipboard (slugs are lowercase, and the dialogs
// compare against the raw value).
export function CopyConfirmToken({
  value,
  tone = 'neutral',
  className = '',
  dataTestid,
}: CopyConfirmTokenProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy() {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.writeText) return;
    try {
      await clipboard.writeText(value);
    } catch {
      // Denied or unavailable (insecure context) — leave the chip idle rather
      // than claiming a copy that never happened.
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Copied' : `Copy “${value}”`}
        aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
        data-testid={dataTestid}
        className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-left font-mono text-[12px] normal-case leading-4 tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 ${TONE_CLASSES[tone]} ${className}`}
      >
        <span className="break-all">{value}</span>
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? `Copied ${value} to clipboard` : ''}
      </span>
    </>
  );
}
