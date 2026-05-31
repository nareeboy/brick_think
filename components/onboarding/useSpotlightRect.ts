'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Tracks a target element's viewport rect every animation frame so a spotlight
 * cut-out stays glued to it through hydration, sibling mounts (e.g. the
 * onboarding checklist appearing), and scrolling — layout shifts that fire no
 * scroll/resize event. Scrolls the target into view once if it isn't already
 * fully visible. Re-renders only when the box actually moves, so it settles to
 * a no-op poll.
 *
 * Returns the rect, or null when inactive / the target isn't in the DOM yet
 * (callers treat null as "not ready").
 */
export function useSpotlightRect(selector: string | null, active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !selector) {
      setRect(null);
      return;
    }
    let rafId = 0;
    let lastKey = '';
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(selector);
      if (!el) {
        if (lastKey !== 'missing') {
          lastKey = 'missing';
          setRect(null);
        }
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (!scrolled) {
        scrolled = true;
        const vr = el.getBoundingClientRect();
        if (vr.top < 0 || vr.bottom > window.innerHeight) {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      const r = el.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height}`;
      if (key !== lastKey) {
        lastKey = key;
        setRect(r);
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [selector, active]);

  return rect;
}
