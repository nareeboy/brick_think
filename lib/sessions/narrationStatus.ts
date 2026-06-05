import type { AckState } from '@/lib/sessions/narrationLiveTypes';

export type RowStatus =
  | { kind: 'idle' }
  | { kind: 'requested' }
  | { kind: 'recording'; count: number }
  | { kind: 'saved' }
  | { kind: 'blocked' };

/**
 * Collapse the ack states of every speaker on one model into a single row label.
 * `requested` is the facilitator's local "I pressed Start and haven't pressed
 * Stop" flag — it keeps the row in the waiting state before any ack arrives.
 */
export function deriveRowStatus(requested: boolean, states: AckState[]): RowStatus {
  const recording = states.filter((s) => s === 'recording').length;
  if (recording > 0) return { kind: 'recording', count: recording };

  const saved = states.filter((s) => s === 'saved').length;
  if (states.length > 0 && saved === states.length) return { kind: 'saved' };

  const declined = states.some((s) => s === 'declined');
  if (declined && !requested) return { kind: 'blocked' };

  if (requested) return { kind: 'requested' };
  if (saved > 0) return { kind: 'saved' };
  return { kind: 'idle' };
}
