'use client';

import type { LiveTranscriptState } from '@/lib/sessions/liveTranscript';

interface Props {
  state: LiveTranscriptState;
  emptyHint?: string;
}

/**
 * Attributed, WhatsApp-style live transcript. Final segments are solid bubbles;
 * each speaker's in-progress (interim) line shows dimmer beneath, replaced as it
 * finalises. Ephemeral — fed from the broadcast channel, never persisted.
 */
export function LiveTranscriptChat({ state, emptyHint }: Props) {
  const interimEntries = Object.entries(state.interim);
  const empty = state.messages.length === 0 && interimEntries.length === 0;

  return (
    <div data-testid="live-transcript-chat" className="flex flex-col gap-2">
      {empty ? (
        <p className="text-[12px] text-zinc-500">
          {emptyHint ?? 'Waiting for the first words…'}
        </p>
      ) : null}

      {state.messages.map((m) => (
        <div key={m.id} className="rounded-2xl bg-zinc-100 px-3 py-2">
          <p className="text-[11px] font-semibold text-zinc-500">{m.name}</p>
          <p className="text-[13px] leading-relaxed text-zinc-800">{m.text}</p>
        </div>
      ))}

      {interimEntries.map(([pid, v]) => (
        <div key={`interim-${pid}`} className="rounded-2xl bg-zinc-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-zinc-500">{v.name}</p>
          <p className="text-[13px] leading-relaxed text-zinc-400">{v.text}</p>
        </div>
      ))}
    </div>
  );
}
