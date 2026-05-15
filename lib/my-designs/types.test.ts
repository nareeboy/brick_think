import { describe, expect, it } from 'vitest';

import { parseFilter, serializeFilter } from './types';

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
