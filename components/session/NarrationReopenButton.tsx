'use client';

import { useNarrationDrawer } from '@/components/session/NarrationDrawerContext';

/**
 * Sidebar affordance to restore a collapsed narration drawer. Sits in the slot
 * the personal-design "Save version" button occupies (session canvases hide that
 * button), and renders only while a narration is active but minimised.
 */
export function NarrationReopenButton() {
  const { active, minimized, setMinimized } = useNarrationDrawer();
  if (!active || !minimized) return null;

  return (
    <button
      type="button"
      onClick={() => setMinimized(false)}
      data-testid="narration-participant-reopen"
      className="mt-auto inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#a8482a] py-4 text-[15px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-all hover:bg-[#cf6e47] active:translate-y-[1px]"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
      Open narration
    </button>
  );
}
