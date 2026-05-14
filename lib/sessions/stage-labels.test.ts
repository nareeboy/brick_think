import { describe, expect, it } from 'vitest';

import { STAGE_LABELS, stageLabel } from './stage-labels';
import type { StageType } from './types';

describe('STAGE_LABELS', () => {
  it('exhaustively maps every stage_type', () => {
    const expected: Record<StageType, string> = {
      skill_building: 'Skill building',
      individual_model: 'Individual model',
      shared_model: 'Shared model',
      system_model: 'System model',
      guiding_principles: 'Guiding principles',
    };
    expect(STAGE_LABELS).toEqual(expected);
  });

  it('stageLabel returns the right string', () => {
    expect(stageLabel('individual_model')).toBe('Individual model');
  });
});
