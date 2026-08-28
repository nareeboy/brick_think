import type { OnboardingPurpose } from '@/lib/onboarding/config';
import type { StageType } from '@/lib/sessions/types';

/**
 * Maps a configuration-flow workshop purpose to one canonical template
 * scenario per stage, by title. Pure config over the 20-template library —
 * `purposeMap.test.ts` guards every title against `CANONICAL_SCENARIOS`, so
 * a template rename fails CI here instead of silently unmapping a purpose.
 * `not_sure` deliberately maps to nothing: no preference, no pre-assignment.
 */
export const PURPOSE_SCENARIO_TITLES: Record<
  Exclude<OnboardingPurpose, 'not_sure'>,
  Record<StageType, string>
> = {
  team_alignment: {
    skill_building: 'Metaphor warm-up',
    individual_model: 'Your ideal team',
    shared_model: 'Find the common ground',
    system_model: 'Tensions and supports',
    guiding_principles: 'Working agreement candidates',
  },
  strategy: {
    skill_building: 'Tower of any height',
    individual_model: 'A challenge you face',
    shared_model: 'Map the territory',
    system_model: 'Show the forces',
    guiding_principles: 'Anchor a principle to each cluster',
  },
  retrospective: {
    skill_building: 'Build your morning',
    individual_model: 'A win you are proud of',
    shared_model: 'Connect your contributions',
    system_model: 'Energy flows',
    guiding_principles: 'Phrase it as a behaviour',
  },
  team_onboarding: {
    skill_building: 'Explain a brick',
    individual_model: 'Your role today',
    shared_model: 'Combine into one landscape',
    system_model: 'Add the agents',
    guiding_principles: 'The principle test',
  },
  product_discovery: {
    skill_building: 'Metaphor warm-up',
    individual_model: 'A challenge you face',
    shared_model: 'Map the territory',
    system_model: 'Show the forces',
    guiding_principles: 'The principle test',
  },
};

/** The template titles a purpose pre-assigns, or null for `not_sure`. */
export function purposeScenarioTitles(
  purpose: OnboardingPurpose | null,
): Record<StageType, string> | null {
  if (purpose === null || purpose === 'not_sure') return null;
  return PURPOSE_SCENARIO_TITLES[purpose];
}

/**
 * One plain sentence naming the purpose, pre-filled into the session brief.
 * Deliberately under the checklist's 40-character brief threshold so the
 * brief item starts tickable, not ticked — the facilitator still writes the
 * real brief.
 */
export const PURPOSE_BRIEF_SENTENCES: Record<Exclude<OnboardingPurpose, 'not_sure'>, string> = {
  team_alignment: 'Purpose: team alignment.',
  strategy: 'Purpose: strategy and vision.',
  retrospective: 'Purpose: retrospective.',
  team_onboarding: 'Purpose: onboarding a new team.',
  product_discovery: 'Purpose: product discovery.',
};

export function purposeBriefSentence(purpose: OnboardingPurpose | null): string | null {
  if (purpose === null || purpose === 'not_sure') return null;
  return PURPOSE_BRIEF_SENTENCES[purpose];
}
