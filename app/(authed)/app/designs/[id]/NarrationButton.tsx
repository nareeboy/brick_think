'use client';

import { useState } from 'react';

import { NarrationDrawer } from '@/components/session/NarrationDrawer';
import type { ModelNarration } from '@/lib/sessions/modelNarration';

interface Props {
  modelId: string;
  canRecord: boolean;
  initialNarration: ModelNarration | null;
}

// Canvas-header trigger for the narration drawer. Rendered only when the
// design belongs to a session stage that supports voice narration (gated
// server-side in the design page).
export function NarrationButton({ modelId, canRecord, initialNarration }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={canRecord ? 'Record your narration' : 'View narration'}
        data-testid="narration-button"
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-zinc-900/10 bg-white/85 px-3.5 text-[13px] font-semibold text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900"
      >
        <span aria-hidden>🎙</span>
        Narrate
      </button>
      <NarrationDrawer
        modelId={modelId}
        canRecord={canRecord}
        initialNarration={initialNarration}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
