'use client';

import { useEffect } from 'react';

import { useOnboardingState } from './useOnboardingState';

/**
 * Renders nothing. Mounted by the session page when the signed-in viewer is
 * an active session participant WITHOUT manage rights — the one moment their
 * invited-guest status is provable server-side. Persists it as the sticky
 * `bt_tutorial_guest` flag so the tutorial modal stays hidden in this browser
 * even after the session (the only server-side evidence) is deleted.
 */
export function MarkTutorialGuest() {
  const { hydrated, tutorialGuestSticky, markTutorialGuest, roleChoice, chooseRole } =
    useOnboardingState();
  useEffect(() => {
    if (!hydrated || tutorialGuestSticky) return;
    // An explicit Facilitator answer outranks the inference — a facilitator
    // guesting in someone else's session keeps their tutorial.
    if (roleChoice === 'facilitator') return;
    markTutorialGuest();
    // Auto-answer the role question so the chooser never appears for
    // join-link arrivals.
    if (roleChoice === null) chooseRole('guest');
  }, [hydrated, tutorialGuestSticky, markTutorialGuest, roleChoice, chooseRole]);
  return null;
}
