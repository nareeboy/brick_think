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
  const { hydrated, tutorialGuestSticky, markTutorialGuest } = useOnboardingState();
  useEffect(() => {
    if (hydrated && !tutorialGuestSticky) markTutorialGuest();
  }, [hydrated, tutorialGuestSticky, markTutorialGuest]);
  return null;
}
