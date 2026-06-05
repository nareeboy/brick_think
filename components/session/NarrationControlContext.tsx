'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { useNarrationLiveChannel } from '@/components/session/narrationRealtime';
import { deriveRowStatus, type RowStatus } from '@/lib/sessions/narrationStatus';
import type { AckState } from '@/lib/sessions/narrationLiveTypes';

interface ContextValue {
  ackStates: Record<string, Record<string, AckState>>;
  requested: Record<string, boolean>;
  start: (modelId: string) => void;
  stop: (modelId: string) => void;
}

const NarrationControlContext = createContext<ContextValue | null>(null);

export function NarrationControlProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const [ackStates, setAckStates] = useState<Record<string, Record<string, AckState>>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  // The facilitator only needs per-speaker status (the live chat is the
  // participant's view, and the saved transcript is read afterwards), so this
  // provider subscribes to acks alone — not the chunk stream.
  const api = useNarrationLiveChannel(sessionId, {
    onAck: (ack) =>
      setAckStates((prev) => ({
        ...prev,
        [ack.modelId]: { ...(prev[ack.modelId] ?? {}), [ack.profileId]: ack.state },
      })),
  });

  const start = useCallback(
    (modelId: string) => {
      // Fresh capture window — clear any prior acks for this model.
      setAckStates((prev) => ({ ...prev, [modelId]: {} }));
      setRequested((prev) => ({ ...prev, [modelId]: true }));
      api.startRecording(modelId);
    },
    [api],
  );

  const stop = useCallback(
    (modelId: string) => {
      setRequested((prev) => ({ ...prev, [modelId]: false }));
      api.stopRecording(modelId);
    },
    [api],
  );

  return (
    <NarrationControlContext.Provider value={{ ackStates, requested, start, stop }}>
      {children}
    </NarrationControlContext.Provider>
  );
}

export interface RowControl {
  status: RowStatus;
  isActive: boolean;
  start: () => void;
  stop: () => void;
}

/**
 * Per-row facilitator control. Returns a disabled stub when used outside a
 * provider so callers don't need to branch.
 */
export function useNarrationRowControl(modelId: string): RowControl {
  const ctx = useContext(NarrationControlContext);
  if (!ctx) {
    return {
      status: { kind: 'idle' },
      isActive: false,
      start: () => {},
      stop: () => {},
    };
  }
  const states = Object.values(ctx.ackStates[modelId] ?? {});
  const isActive = ctx.requested[modelId] ?? false;
  return {
    status: deriveRowStatus(isActive, states),
    isActive,
    start: () => ctx.start(modelId),
    stop: () => ctx.stop(modelId),
  };
}
