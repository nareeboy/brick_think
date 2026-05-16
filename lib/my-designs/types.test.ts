import { describe, expect, it } from 'vitest';

import {
  isValidTag,
  normaliseTag,
  parseFilter,
  parseSort,
  parseTagList,
  serializeFilter,
  serializeSort,
  serializeTagList,
  sortLabel,
} from './types';

describe('parseFilter', () => {
  it('returns all for null', () => {
    expect(parseFilter(null)).toEqual({ kind: 'all' });
  });

  it('returns all for "all"', () => {
    expect(parseFilter('all')).toEqual({ kind: 'all' });
  });

  it('returns personal for "personal"', () => {
    expect(parseFilter('personal')).toEqual({ kind: 'personal' });
  });

  it('returns org for "org-<uuid>"', () => {
    const uuid = '00000000-0000-0000-0000-000000000001';
    expect(parseFilter(`org-${uuid}`)).toEqual({ kind: 'org', orgId: uuid });
  });

  it('falls back to all for malformed org filter', () => {
    expect(parseFilter('org-not-a-uuid')).toEqual({ kind: 'all' });
    expect(parseFilter('garbage')).toEqual({ kind: 'all' });
  });

  it('round-trips through serializeFilter', () => {
    const cases: Array<Parameters<typeof serializeFilter>[0]> = [
      { kind: 'all' },
      { kind: 'personal' },
      { kind: 'org', orgId: '00000000-0000-0000-0000-000000000001' },
    ];
    for (const c of cases) {
      expect(parseFilter(serializeFilter(c))).toEqual(c);
    }
  });
});

describe('parseSort', () => {
  it('defaults to newest', () => {
    expect(parseSort(null)).toBe('newest');
    expect(parseSort('')).toBe('newest');
    expect(parseSort('garbage')).toBe('newest');
  });

  it('accepts known values', () => {
    expect(parseSort('oldest')).toBe('oldest');
    expect(parseSort('title-asc')).toBe('title-asc');
    expect(parseSort('title-desc')).toBe('title-desc');
  });

  it('round-trips and labels every value', () => {
    for (const value of ['newest', 'oldest', 'title-asc', 'title-desc'] as const) {
      expect(parseSort(serializeSort(value))).toBe(value);
      expect(sortLabel(value).length).toBeGreaterThan(0);
    }
  });
});

describe('tag helpers', () => {
  it('accepts simple tags', () => {
    expect(isValidTag('design')).toBe(true);
    expect(isValidTag('lego-bricks')).toBe(true);
    expect(isValidTag('p1')).toBe(true);
  });

  it('rejects invalid shapes', () => {
    expect(isValidTag('')).toBe(false);
    expect(isValidTag('-leading-hyphen')).toBe(false);
    expect(isValidTag('UPPER')).toBe(false);
    expect(isValidTag('has space')).toBe(false);
    expect(isValidTag('a'.repeat(33))).toBe(false);
  });

  it('normalises raw input', () => {
    expect(normaliseTag('  Lego Bricks  ')).toBe('lego-bricks');
    expect(normaliseTag('FOO')).toBe('foo');
    expect(normaliseTag(' multi    space ')).toBe('multi-space');
  });
});

describe('parseTagList', () => {
  it('returns empty for null or blank', () => {
    expect(parseTagList(null)).toEqual([]);
    expect(parseTagList('')).toEqual([]);
    expect(parseTagList(',,,')).toEqual([]);
  });

  it('splits comma-separated and trims each', () => {
    expect(parseTagList('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('drops invalid shapes silently', () => {
    expect(parseTagList('good,UPPER,has space,-bad,also-good')).toEqual([
      'good',
      'also-good',
    ]);
  });

  it('dedupes while preserving order', () => {
    expect(parseTagList('a,b,a,c,b')).toEqual(['a', 'b', 'c']);
  });

  it('caps the active list at 8 to avoid pathological URL inputs', () => {
    const big = Array.from({ length: 20 }, (_, i) => `t${i}`).join(',');
    expect(parseTagList(big)).toHaveLength(8);
  });

  it('round-trips through serializeTagList', () => {
    const cases = [['a'], ['a', 'b'], ['foo', 'bar-baz', 'p1']];
    for (const value of cases) {
      expect(parseTagList(serializeTagList(value))).toEqual(value);
    }
  });
});
