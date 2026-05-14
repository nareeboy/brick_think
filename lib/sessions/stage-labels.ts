import type { StageType } from './types';

export const STAGE_LABELS: Record<StageType, string> = {
  skill_building: 'Skill building',
  individual_model: 'Individual model',
  shared_model: 'Shared model',
  system_model: 'System model',
  guiding_principles: 'Guiding principles',
};

export function stageLabel(stageType: StageType): string {
  return STAGE_LABELS[stageType];
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
