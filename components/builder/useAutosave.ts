'use client';

import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const RETRY_DELAYS_MS = [1000, 3000, 9000];

interface Options<P> {
  modelId: string | null;
  payload: P;
  debounceMs?: number;
  disabled?: boolean;
}

export interface AutosaveResult {
  status: SaveStatus;
  lastSavedAt: number | null;
  retry: () => void;
}

export function useAutosave<P>({
  modelId,
  payload,
  debounceMs = 1000,
  disabled = false,
}: Options<P>): AutosaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const pendingPayload = useRef<P | null>(null);
  const lastFiredPayload = useRef<P | null>(null);
  const initialPayload = useRef<P>(payload);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  async function doSave(p: P): Promise<void> {
    if (!modelId) return;
    setStatus('saving');
    try {
      const res = await fetch(`/api/models/${modelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error(`PATCH ${res.status}`);
      lastFiredPayload.current = p;
      setLastSavedAt(Date.now());
      attemptRef.current = 0;
      if (pendingPayload.current !== null && pendingPayload.current !== p) {
        const next = pendingPayload.current;
        pendingPayload.current = null;
        inFlight.current = doSave(next);
        return;
      }
      pendingPayload.current = null;
      inFlight.current = null;
      setStatus('saved');
    } catch {
      if (attemptRef.current < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attemptRef.current]!;
        attemptRef.current += 1;
        setTimeout(() => {
          inFlight.current = doSave(p);
        }, delay);
        return;
      }
      setStatus('error');
      inFlight.current = null;
      return;
    }
  }

  useEffect(() => {
    if (disabled) return;
    if (!modelId) return;
    if (payload === initialPayload.current) return; // never saved yet, no change
    if (lastFiredPayload.current !== null && payload === lastFiredPayload.current) {
      return; // identity-stable post-save, ignore
    }
    // If a save is already in flight, immediately queue this payload — the
    // current save's success branch picks it up. Don't restart the debounce.
    if (inFlight.current) {
      pendingPayload.current = payload;
      return;
    }
    setStatus((s) => (s === 'error' ? s : 'dirty'));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      inFlight.current = doSave(payload);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, modelId, debounceMs, disabled]);

  function retry() {
    if (disabled) return;
    if (!modelId) return;
    if (inFlight.current) return;
    attemptRef.current = 0;
    inFlight.current = doSave(payload);
  }

  return { status, lastSavedAt, retry };
}
