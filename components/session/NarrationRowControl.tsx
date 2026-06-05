'use client';

import { useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { LiveTranscriptChat } from '@/components/session/LiveTranscriptChat';
import { useNarrationRowControl } from '@/components/session/NarrationControlContext';
import type { RowStatus } from '@/lib/sessions/narrationStatus';

function statusLabel(status: RowStatus): string | null {
  switch (status.kind) {
    case 'requested':
      return 'Waiting for mic…';
    case 'recording':
      return status.count > 1 ? `● ${status.count} recording` : '● Recording';
    case 'saved':
      return 'Saved ✓';
    case 'blocked':
      return 'Mic blocked';
    default:
      return null;
  }
}

/**
 * Facilitator Start/Stop narration toggle for one model (a participant row or a
 * room row). Broadcasts via the shared control context; shows live status and a
 * "Live" button that opens the streaming attributed chat.
 */
export function NarrationRowControl({
  modelId,
  label,
  size = 'md',
}: {
  modelId: string;
  /** Heading used in the live modal, e.g. the participant or room name. */
  label: string;
  size?: 'sm' | 'md';
}) {
  const { status, isActive, live, start, stop } = useNarrationRowControl(modelId);
  const [showLive, setShowLive] = useState(false);

  const h = size === 'sm' ? 'h-8' : 'h-9';
  const chip = statusLabel(status);
  const buttonLabel = isActive ? 'Stop' : status.kind === 'saved' ? 'Re-record' : 'Narrate';

  return (
    <>
      {chip ? (
        <span
          data-testid={`narration-status-${modelId}`}
          className="text-[11px] font-medium text-zinc-500"
        >
          {chip}
        </span>
      ) : null}

      {isActive ? (
        <button
          type="button"
          onClick={() => setShowLive(true)}
          data-testid={`narration-live-${modelId}`}
          title="Watch the live transcript"
          className={`inline-flex ${h} cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5`}
        >
          Live
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => (isActive ? stop() : start())}
        data-testid={
          isActive ? `narration-stop-${modelId}` : `narration-start-${modelId}`
        }
        title={isActive ? 'Stop story capture' : 'Start story capture for this canvas'}
        aria-pressed={isActive}
        className={`inline-flex ${h} cursor-pointer items-center justify-center rounded-xl border px-3 text-[12px] font-medium transition-colors ${
          isActive
            ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
            : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-900/5'
        }`}
      >
        {buttonLabel}
      </button>

      {showLive ? (
        <ModalBackdrop
          onClose={() => setShowLive(false)}
          ariaLabel={`Live transcript — ${label}`}
          panelClassName="w-full max-w-lg"
        >
          <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">Live transcript — {label}</h2>
              <button
                type="button"
                onClick={() => setShowLive(false)}
                aria-label="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded p-1 text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <LiveTranscriptChat state={live} />
            </div>
          </div>
        </ModalBackdrop>
      ) : null}
    </>
  );
}
