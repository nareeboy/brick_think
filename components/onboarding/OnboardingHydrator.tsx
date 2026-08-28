'use client';

import { useEffect } from 'react';

import type { OnboardingServerState } from '@/lib/onboarding/config';

import { hydrateOnboardingFromServer } from './useOnboardingState';

/**
 * Bridges the server-side onboarding state (profiles.onboarding, loaded by the
 * authed layout) into the per-device `bt_` localStorage caches so a returning
 * user on a new device never re-answers the configuration flow. Server wins on
 * conflict; empty server state is a no-op (pre-migration users keep their
 * local progress). Renders nothing.
 */
export function OnboardingHydrator({ state }: { state: OnboardingServerState }) {
  useEffect(() => {
    hydrateOnboardingFromServer(state);
  }, [state]);

  return null;
}
