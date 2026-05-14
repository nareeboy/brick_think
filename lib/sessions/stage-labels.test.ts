import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL_TITLES,
  STAGE_LABELS,
  defaultModelTitle,
  stageLabel,
} from './stage-labels';
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

describe('DEFAULT_MODEL_TITLES', () => {
  it('never produces a doubled "model" suffix', () => {
    for (const title of Object.values(DEFAULT_MODEL_TITLES)) {
      expect(title).not.toMatch(/model model$/i);
    }
  });

  it('defaultModelTitle returns the curated string for shared_model', () => {
    expect(defaultModelTitle('shared_model')).toBe('Shared model');
  });
});
