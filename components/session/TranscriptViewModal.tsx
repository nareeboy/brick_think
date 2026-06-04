'use client';

import { useId } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

interface Props {
  /** Heading, e.g. a participant name or a room name. */
  title: string;
  /** Combined transcript text (one speaker verbatim, or several attributed). */
  body: string;
  /** True when any contributing narration was polished by Claude. */
  polished: boolean;
  onClose: () => void;
}

/**
 * Read-only facilitator view of a model's combined narration transcript. On an
 * individual canvas that's the owner's narration; on a room canvas it's every
 * member's narration merged into one. Pure display — no recording controls.
 */
export function TranscriptViewModal({ title, body, polished, onClose }: Props) {
  const titleId = useId();

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-zinc-900">
              {title}
            </h2>
            {polished ? (
              <span className="mt-1 inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                Polished by Claude
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">{body}</p>
        </div>
      </div>
    </ModalBackdrop>
  );
}
