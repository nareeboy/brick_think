'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bt:brick-overlays';

function readStored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw !== '0';
  } catch {
    return true;
  }
}

/**
 * Per-viewer pattern-overlay preference, persisted globally for this browser.
 *
 * Used only on session canvases where the facilitator has forced overlays on:
 * the default is "on" (matching the facilitator's choice), but the viewer can
 * switch the overlays off for themselves. The choice is remembered across
 * sessions/canvases; because the in-canvas toggle is always present whenever the
 * facilitator forced overlays on, the override is always reversible.
 *
 * Mirrors {@link useFeedbackVisible}: SSR + first paint render `true` so the
 * overlays don't pop between server HTML and hydration, then re-sync from
 * storage on mount.
 */
export function useBrickOverlays(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readStored());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabled(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* localStorage unavailable — keep in-memory state only */
      }
      return next;
    });
  }, []);

  return [enabled, toggle];
}
