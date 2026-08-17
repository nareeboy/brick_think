'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useOnboardingState } from './useOnboardingState';

// Only the hub pages steer an unanswered user to the role question — deep
// links (sessions, canvases, join flows) never bounce, so join-link arrivals
// reach the session page where MarkTutorialGuest auto-answers for them.
const HUB_PATHS = ['/app/my-designs', '/app/workshops', '/app/scenarios'];

interface Props {
  /** Server-resolved tutorial guest — self-evidently a guest, never asked. */
  guest?: boolean;
}

/**
 * Renders nothing. Sends first-run users from a hub page to /app/choose-role
 * until the role question (`bt_role_choice`) has been answered. The page
 * itself hosts the two-card choice (RoleChooserCards).
 */
export function RoleChooserRedirect({ guest = false }: Props) {
  const { role, hydrated, welcomeSeen, roleChoice, tutorialGuestSticky } = useOnboardingState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tourInFlight = searchParams.get('onboarding') !== null;
  const needsChoice =
    hydrated &&
    !guest &&
    !tutorialGuestSticky &&
    roleChoice === null &&
    // Legacy participant branch and users who already dismissed the tutorial
    // have answered the question in spirit — don't re-ask.
    role !== 'participant' &&
    !welcomeSeen &&
    !tourInFlight &&
    HUB_PATHS.includes(pathname);

  useEffect(() => {
    if (needsChoice) router.replace('/app/choose-role');
  }, [needsChoice, router]);

  return null;
}
