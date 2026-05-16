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
