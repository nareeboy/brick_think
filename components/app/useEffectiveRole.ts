'use client';

import { useOnboardingState } from '@/components/onboarding/useOnboardingState';
import type { GlobalRole } from '@/lib/account/globalRole';

/**
 * The role the header actually presents: the user's explicit first-run /
 * switcher choice (`bt_role_choice`, with the sticky guest flag as a
 * fallback signal) overrides the server-derived GlobalRole; before hydration
 * — or with no client signals — the server value stands.
 */
export function useEffectiveRole(serverRole: GlobalRole): GlobalRole {
  const { hydrated, roleChoice, tutorialGuestSticky } = useOnboardingState();
  if (!hydrated) return serverRole;
  if (roleChoice === 'facilitator') return 'facilitator';
  if (roleChoice === 'guest' || tutorialGuestSticky) return 'guest';
  return serverRole;
}
