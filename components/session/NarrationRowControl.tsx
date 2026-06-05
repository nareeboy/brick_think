'use client';

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
 * room row). Broadcasts via the shared control context and shows a live status
 * chip. The facilitator reads the captured story afterwards via the existing
 * Transcript button — there is no live-stream view here.
 */
export function NarrationRowControl({
  modelId,
  size = 'md',
}: {
  modelId: string;
  size?: 'sm' | 'md';
}) {
  const { status, isActive, start, stop } = useNarrationRowControl(modelId);

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

      <button
        type="button"
        onClick={() => (isActive ? stop() : start())}
        data-testid={isActive ? `narration-stop-${modelId}` : `narration-start-${modelId}`}
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
    </>
  );
}
