import { describe, expect, it } from 'vitest';

import {
  isValidTransition,
  type StageStatus,
  type StageVerb,
} from './stage-state-machine';

describe('isValidTransition', () => {
  const cases: Array<[StageStatus, StageVerb, boolean]> = [
    ['pending', 'start', true],
    ['pending', 'pause', false],
    ['pending', 'advance', false],
    ['active', 'pause', true],
    ['active', 'resume', false],
    ['active', 'extend', true],
    ['active', 'advance', true],
    ['paused', 'resume', true],
    ['paused', 'pause', false],
    ['paused', 'extend', true],
    ['paused', 'advance', true],
    ['completed', 'rollback', true],
    ['completed', 'start', false],
    ['completed', 'pause', false],
  ];
  it.each(cases)('from %s with verb %s → %s', (from, verb, expected) => {
    expect(isValidTransition(from, verb)).toBe(expected);
  });
});
