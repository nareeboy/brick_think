'use client';

import { useId, useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import type { ModelNarration } from '@/lib/sessions/modelNarration';

interface Props {
  participantName: string;
  narration: ModelNarration;
  onClose: () => void;
}

/**
 * Read-only facilitator view of a participant's saved narration transcript.
 * The transcript text is already fetched server-side (the facilitator can read
 * every session model), so this is pure display — no recording controls.
 */
export function TranscriptViewModal({ participantName, narration, onClose }: Props) {
  const titleId = useId();
  const [showRaw, setShowRaw] = useState(false);

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-zinc-900">
              {participantName}&rsquo;s narration
            </h2>
            {narration.cleaned ? (
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
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
            {showRaw ? narration.transcriptRaw : narration.transcript}
          </p>
        </div>

        {narration.cleaned ? (
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 text-[12px] text-[#c0613d] underline-offset-2 hover:underline"
          >
            {showRaw ? 'Show polished' : 'View raw'}
          </button>
        ) : null}
        {narration.cleanupStatus === 'failed' ? (
          <p className="mt-2 text-[12px] text-zinc-500">
            Couldn&rsquo;t polish — showing the words as captured.
          </p>
        ) : null}
      </div>
    </ModalBackdrop>
  );
}
