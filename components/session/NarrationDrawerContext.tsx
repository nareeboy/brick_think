'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface NarrationDrawerValue {
  /** A narration drawer is in progress (prompting / recording / saved). */
  active: boolean;
  /** The attendee collapsed the drawer; recording keeps running. */
  minimized: boolean;
  setActive: (v: boolean) => void;
  setMinimized: (v: boolean) => void;
}

const NarrationDrawerContext = createContext<NarrationDrawerValue | null>(null);

/**
 * Shares the participant recorder drawer's collapsed state between the canvas
 * overlay (which renders the drawer) and the sidebar (which renders the reopen
 * button), so an accidental close can be undone from the sidebar.
 */
export function NarrationDrawerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const value = useMemo(
    () => ({ active, minimized, setActive, setMinimized }),
    [active, minimized],
  );
  return (
    <NarrationDrawerContext.Provider value={value}>{children}</NarrationDrawerContext.Provider>
  );
}

/** Returns an inert stub outside a provider so consumers don't need to branch. */
export function useNarrationDrawer(): NarrationDrawerValue {
  const ctx = useContext(NarrationDrawerContext);
  if (!ctx) {
    return { active: false, minimized: false, setActive: () => {}, setMinimized: () => {} };
  }
  return ctx;
}
