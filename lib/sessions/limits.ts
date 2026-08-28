import type { OnboardingGroupSize } from '@/lib/onboarding/config';

/**
 * The recommended ceiling of builders per session. Not enforced anywhere —
 * it is the number the configuration flow states plainly when a facilitator
 * says nine or more people will build, and the basis for the room-count
 * suggestion below. Larger groups split across parallel rooms in the shared
 * model stage.
 */
export const RECOMMENDED_MAX_PARTICIPANTS = 8;

/**
 * Suggested number of rooms for partitioning the shared model stage, from the
 * configuration flow's group-size answer. A suggestion only: it pre-seeds
 * empty room rows in the manage-rooms dialog and never writes rooms itself.
 */
export function suggestedRoomCount(size: OnboardingGroupSize | null): number {
  switch (size) {
    case '5_8':
      return 2;
    case '9_plus':
      return 3;
    default:
      return 1;
  }
}
