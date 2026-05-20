import type { StageType } from '@/lib/sessions/types';

const PILL_SHAPE =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]';

const PALETTES: Record<StageType, string> = {
  skill_building: 'bg-violet-50 text-violet-800',
  individual_model: 'bg-sky-50 text-sky-800',
  shared_model: 'bg-emerald-50 text-emerald-800',
  system_model: 'bg-amber-50 text-amber-900',
  guiding_principles: 'bg-rose-50 text-rose-800',
};

export const STAGE_CHIP_LABEL: Record<StageType, string> = {
  skill_building: 'Skill-building',
  individual_model: 'Individual',
  shared_model: 'Shared',
  system_model: 'System',
  guiding_principles: 'Principles',
};

export function stageChipClasses(stageType: StageType): string {
  return `${PILL_SHAPE} ${PALETTES[stageType]}`;
}
