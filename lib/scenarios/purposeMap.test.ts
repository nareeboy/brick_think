import { describe, expect, it } from 'vitest';

import { CANONICAL_SCENARIOS } from './canonical';
import {
  PURPOSE_BRIEF_SENTENCES,
  PURPOSE_SCENARIO_TITLES,
  purposeBriefSentence,
  purposeScenarioTitles,
} from './purposeMap';

// Mirrors PreSessionChecklist's BRIEF_THRESHOLD: the pre-fill must start the
// brief item tickable, not ticked.
const BRIEF_TICK_THRESHOLD = 40;

describe('PURPOSE_SCENARIO_TITLES', () => {
  it('every mapped title exists in the canonical library under its stage', () => {
    for (const [purpose, byStage] of Object.entries(PURPOSE_SCENARIO_TITLES)) {
      for (const [stage, title] of Object.entries(byStage)) {
        const match = CANONICAL_SCENARIOS.find((s) => s.title === title && s.stage_type === stage);
        expect(match, `${purpose} → ${stage} → "${title}" not in canonical library`).toBeTruthy();
      }
    }
  });

  it('covers all five stages for every purpose', () => {
    for (const byStage of Object.values(PURPOSE_SCENARIO_TITLES)) {
      expect(Object.keys(byStage)).toHaveLength(5);
    }
  });

  it('not_sure and null map to nothing', () => {
    expect(purposeScenarioTitles('not_sure')).toBeNull();
    expect(purposeScenarioTitles(null)).toBeNull();
    expect(purposeScenarioTitles('retrospective')).toEqual(PURPOSE_SCENARIO_TITLES.retrospective);
  });
});

describe('PURPOSE_BRIEF_SENTENCES', () => {
  it('every sentence stays under the checklist tick threshold', () => {
    for (const sentence of Object.values(PURPOSE_BRIEF_SENTENCES)) {
      expect(sentence.trim().length).toBeGreaterThan(0);
      expect(sentence.trim().length).toBeLessThan(BRIEF_TICK_THRESHOLD);
    }
  });

  it('not_sure and null pre-fill nothing', () => {
    expect(purposeBriefSentence('not_sure')).toBeNull();
    expect(purposeBriefSentence(null)).toBeNull();
  });
});
