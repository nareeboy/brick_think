'use client';

import { useBuilderState, useRelativeTime } from './builderState';

export function SaveStatus() {
  const { saveStatus, savedAtServer, retrySave, modelId } = useBuilderState();
  const rel = useRelativeTime(savedAtServer);

  if (!modelId) return null;

  if (saveStatus === 'error') {
    return (
      <button
        type="button"
        onClick={retrySave}
        className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-red-700 hover:bg-red-100"
      >
        Couldn&apos;t save · Retry
      </button>
    );
  }

  let text: string;
  if (saveStatus === 'saving') text = 'Saving…';
  else if (saveStatus === 'dirty') text = 'Unsaved changes…';
  else if (savedAtServer !== null) text = `Saved ${rel ?? 'just now'}`;
  else text = 'Saved';

  return (
    <p
      data-testid="save-status"
      data-status={saveStatus}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500"
    >
      {text}
    </p>
  );
}
