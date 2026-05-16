'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { useOnboardingState } from './useOnboardingState';

const SELECTOR = '[data-tour-id="first-stage-card"]';

export function ParticipantCoachMark() {
  const { role, sessionTourSeen, hydrated, markSessionTourSeen } = useOnboardingState();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const active = hydrated && role === 'participant' && !sessionTourSeen;
  const dismiss = useCallback(() => markSessionTourSeen(), [markSessionTourSeen]);

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = document.querySelector(SELECTOR);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    const onClick = () => dismiss();
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick, { capture: true });
    };
  }, [active, dismiss]);

  if (!active || !rect) return null;

  const left = Math.max(16, rect.left);
  const top = rect.bottom + 12;

  return (
    <div
      role="dialog"
      aria-label="Welcome — start with your stage"
      data-testid="onboarding-coachmark"
      style={{ left, top, width: 280 }}
      className="fixed z-50 rounded-2xl border border-zinc-900/10 bg-white p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)]"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Welcome</p>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">
        Click your stage card to start your model for this stage.
      </p>
    </div>
  );
}
