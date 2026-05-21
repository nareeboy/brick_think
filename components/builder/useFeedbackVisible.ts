'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bt:feedback-visible';

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

export function useFeedbackVisible(): [boolean, () => void] {
  // SSR + first paint render with `true` so the layers don't pop in/out
  // between server HTML and hydration. The effect re-syncs from storage on
  // mount; subsequent toggles persist.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(readStored());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setVisible(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setVisible((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* localStorage unavailable — keep in-memory state only */
      }
      return next;
    });
  }, []);

  return [visible, toggle];
}
