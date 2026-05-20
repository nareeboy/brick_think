import { describe, test, expect } from 'vitest';

import { DURATION_BUCKETS, filterScenarios } from './filter';
import type { Scenario } from './types';

const sample: Scenario[] = [
  {
    id: '1',
    org_id: null,
    stage_type: 'skill_building',
    title: 'Tower of any height',
    body: 'Build any tower.',
    tags: ['warmup'],
    duration_minutes: 5,
    is_template: true,
    created_at: '',
  },
  {
    id: '2',
    org_id: null,
    stage_type: 'individual_model',
    title: 'Your role today',
    body: 'Show your role.',
    tags: ['intro'],
    duration_minutes: 20,
    is_template: true,
    created_at: '',
  },
  {
    id: '3',
    org_id: null,
    stage_type: 'shared_model',
    title: 'Combine into one landscape',
    body: 'Merge models.',
    tags: ['merge'],
    duration_minutes: 45,
    is_template: true,
    created_at: '',
  },
];

describe('filterScenarios', () => {
  test('stage filter "all" returns every row', () => {
    expect(filterScenarios(sample, { stage: 'all', duration: 'any', search: '' })).toHaveLength(3);
  });

  test('stage filter narrows to one stage_type', () => {
    const out = filterScenarios(sample, { stage: 'individual_model', duration: 'any', search: '' });
    expect(out.map((s) => s.id)).toEqual(['2']);
  });

  test('duration bucket "≤10 min" includes 5 but not 20', () => {
    const out = filterScenarios(sample, { stage: 'all', duration: 'short', search: '' });
    expect(out.map((s) => s.id)).toEqual(['1']);
  });

  test('duration bucket "10–30 min" includes 20 but not 5 or 45', () => {
    const out = filterScenarios(sample, { stage: 'all', duration: 'medium', search: '' });
    expect(out.map((s) => s.id)).toEqual(['2']);
  });

  test('duration bucket "30+ min" includes 45 only', () => {
    const out = filterScenarios(sample, { stage: 'all', duration: 'long', search: '' });
    expect(out.map((s) => s.id)).toEqual(['3']);
  });

  test('search matches title (case-insensitive)', () => {
    expect(filterScenarios(sample, { stage: 'all', duration: 'any', search: 'TOWER' })).toHaveLength(1);
  });

  test('search matches body text', () => {
    expect(filterScenarios(sample, { stage: 'all', duration: 'any', search: 'merge' })).toHaveLength(1);
  });

  test('search matches a tag substring', () => {
    expect(filterScenarios(sample, { stage: 'all', duration: 'any', search: 'warm' })).toHaveLength(1);
  });

  test('combined filters AND together', () => {
    expect(
      filterScenarios(sample, { stage: 'shared_model', duration: 'long', search: 'landscape' }),
    ).toHaveLength(1);
  });

  test('empty result preserves array shape', () => {
    expect(filterScenarios(sample, { stage: 'system_model', duration: 'any', search: '' })).toEqual([]);
  });

  test('DURATION_BUCKETS exposes the four labels in order', () => {
    expect(DURATION_BUCKETS).toEqual(['any', 'short', 'medium', 'long']);
  });
});
