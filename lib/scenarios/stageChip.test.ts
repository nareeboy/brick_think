import { describe, test, expect } from 'vitest';

import { stageChipClasses, STAGE_CHIP_LABEL } from './stageChip';

describe('stageChipClasses', () => {
  test.each([
    ['skill_building', 'bg-violet-50 text-violet-800'],
    ['individual_model', 'bg-sky-50 text-sky-800'],
    ['shared_model', 'bg-emerald-50 text-emerald-800'],
    ['system_model', 'bg-amber-50 text-amber-900'],
    ['guiding_principles', 'bg-rose-50 text-rose-800'],
  ] as const)('%s returns palette %s', (stage, expected) => {
    expect(stageChipClasses(stage)).toContain(expected);
  });

  test('all entries include the shared pill shape', () => {
    expect(stageChipClasses('skill_building')).toContain(
      'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]',
    );
  });
});

describe('STAGE_CHIP_LABEL', () => {
  test('returns the canonical short label for each stage_type', () => {
    expect(STAGE_CHIP_LABEL).toEqual({
      skill_building: 'Skill-building',
      individual_model: 'Individual',
      shared_model: 'Shared',
      system_model: 'System',
      guiding_principles: 'Principles',
    });
  });
});
