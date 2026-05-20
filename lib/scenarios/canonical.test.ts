import { describe, test, expect } from 'vitest';

import { CANONICAL_SCENARIOS } from './canonical';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

describe('CANONICAL_SCENARIOS', () => {
  test('contains 20 entries (4 per stage)', () => {
    expect(CANONICAL_SCENARIOS).toHaveLength(20);
  });

  test('every entry has a stage_type from the canonical set', () => {
    for (const s of CANONICAL_SCENARIOS) {
      expect(CANONICAL_STAGE_TYPES).toContain(s.stage_type);
    }
  });

  test('exactly 4 entries per stage_type', () => {
    const counts: Record<StageType, number> = {
      skill_building: 0,
      individual_model: 0,
      shared_model: 0,
      system_model: 0,
      guiding_principles: 0,
    };
    for (const s of CANONICAL_SCENARIOS) counts[s.stage_type]++;
    for (const stage of CANONICAL_STAGE_TYPES) {
      expect(counts[stage]).toBe(4);
    }
  });

  test('title length 1..120 chars', () => {
    for (const s of CANONICAL_SCENARIOS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.title.length).toBeLessThanOrEqual(120);
    }
  });

  test('body length 1..4000 chars', () => {
    for (const s of CANONICAL_SCENARIOS) {
      expect(s.body.length).toBeGreaterThan(0);
      expect(s.body.length).toBeLessThanOrEqual(4000);
    }
  });

  test('duration_minutes in [1, 240]', () => {
    for (const s of CANONICAL_SCENARIOS) {
      expect(s.duration_minutes).toBeGreaterThanOrEqual(1);
      expect(s.duration_minutes).toBeLessThanOrEqual(240);
    }
  });

  test('tags is an array of non-empty strings', () => {
    for (const s of CANONICAL_SCENARIOS) {
      expect(Array.isArray(s.tags)).toBe(true);
      for (const t of s.tags) {
        expect(typeof t).toBe('string');
        expect(t.length).toBeGreaterThan(0);
      }
    }
  });

  test('titles are unique', () => {
    const set = new Set(CANONICAL_SCENARIOS.map((s) => s.title));
    expect(set.size).toBe(CANONICAL_SCENARIOS.length);
  });
});
