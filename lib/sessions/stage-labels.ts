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
