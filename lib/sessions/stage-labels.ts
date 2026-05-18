import type { StageType } from './types';

export const STAGE_LABELS: Record<StageType, string> = {
  skill_building: 'Skill building',
  individual_model: 'Individual model',
  shared_model: 'Shared model',
  system_model: 'System model',
  guiding_principles: 'Guiding principles',
};

export const STAGE_DESCRIPTIONS: Record<StageType, string> = {
  skill_building: 'Warm-up builds to get fluent with the bricks before the real work.',
  individual_model: 'Everyone answers the challenge with their own model — no consensus yet.',
  shared_model: 'Merge the individual models into one the whole group agrees on.',
  system_model: 'Place the shared models in relation to each other to see the system.',
  guiding_principles: 'Capture the simple rules that hold the system together.',
};

export function stageLabel(stageType: StageType): string {
  return STAGE_LABELS[stageType];
}

export function stageDescription(stageType: StageType): string {
  return STAGE_DESCRIPTIONS[stageType];
}

// Default title for a fresh model in a given stage. Hand-curated rather than
// `${stageLabel} model` to avoid the "Shared model model" double-suffix.
export const DEFAULT_MODEL_TITLES: Record<StageType, string> = {
  skill_building: 'Skill-building model',
  individual_model: 'Individual model',
  shared_model: 'Shared model',
  system_model: 'System model',
  guiding_principles: 'Guiding principles model',
};

export function defaultModelTitle(stageType: StageType): string {
  return DEFAULT_MODEL_TITLES[stageType];
}

// Default per-stage duration in seconds. Sourced from PRD §4 ("methodology
// stages") — applied at session creation so the participant timer chip has
// something to count down. Facilitator can extend per-stage at runtime.
//
// PRD §4.2 individual_model is "10 min build + 3 min narration per person"
// — we encode the build portion only (10 min). Narration is a future
// per-participant timer outside this scope.
export const STAGE_DEFAULT_DURATIONS_SECONDS: Record<StageType, number> = {
  skill_building: 15 * 60,
  individual_model: 10 * 60,
  shared_model: 30 * 60,
  system_model: 25 * 60,
  guiding_principles: 20 * 60,
};
