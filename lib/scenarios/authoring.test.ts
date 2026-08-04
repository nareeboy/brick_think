import { describe, test, expect } from 'vitest';

import {
  SCENARIO_BODY_MAX,
  SCENARIO_TAGS_MAX,
  SCENARIO_TITLE_MAX,
  parseTags,
  validateScenarioDraft,
} from './authoring';

const ORG_ID = '11111111-2222-4333-8444-555555555555';

const validInput = {
  stageType: 'individual_model',
  title: 'Our quarterly ritual',
  body: 'Model the ritual your team repeats every quarter.',
  durationMinutes: 15,
  tags: 'ritual, team',
  orgId: ORG_ID,
};

describe('parseTags', () => {
  test('splits on commas, trims, and drops empties', () => {
    expect(parseTags(' one, two ,,  three ')).toEqual(['one', 'two', 'three']);
  });

  test('dedupes exact repeats', () => {
    expect(parseTags('a, b, a')).toEqual(['a', 'b']);
  });

  test('caps at SCENARIO_TAGS_MAX entries', () => {
    const raw = Array.from({ length: SCENARIO_TAGS_MAX + 3 }, (_, i) => `t${i}`).join(',');
    expect(parseTags(raw)).toHaveLength(SCENARIO_TAGS_MAX);
  });

  test('empty string yields empty array', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('validateScenarioDraft', () => {
  test('accepts a valid draft and trims title/body', () => {
    const res = validateScenarioDraft({ ...validInput, title: '  Padded title  ' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.draft.title).toBe('Padded title');
      expect(res.draft.stageType).toBe('individual_model');
      expect(res.draft.tags).toEqual(['ritual', 'team']);
      expect(res.draft.orgId).toBe(ORG_ID);
    }
  });

  test('rejects empty or whitespace-only title', () => {
    expect(validateScenarioDraft({ ...validInput, title: '   ' }).ok).toBe(false);
  });

  test('rejects overlong title', () => {
    expect(
      validateScenarioDraft({ ...validInput, title: 'x'.repeat(SCENARIO_TITLE_MAX + 1) }).ok,
    ).toBe(false);
  });

  test('rejects empty body', () => {
    expect(validateScenarioDraft({ ...validInput, body: '' }).ok).toBe(false);
  });

  test('rejects overlong body', () => {
    expect(
      validateScenarioDraft({ ...validInput, body: 'x'.repeat(SCENARIO_BODY_MAX + 1) }).ok,
    ).toBe(false);
  });

  test('rejects non-integer duration', () => {
    expect(validateScenarioDraft({ ...validInput, durationMinutes: 12.5 }).ok).toBe(false);
  });

  test('rejects out-of-range duration', () => {
    expect(validateScenarioDraft({ ...validInput, durationMinutes: 0 }).ok).toBe(false);
    expect(validateScenarioDraft({ ...validInput, durationMinutes: 241 }).ok).toBe(false);
  });

  test('rejects unknown stage type', () => {
    expect(validateScenarioDraft({ ...validInput, stageType: 'daydreaming' }).ok).toBe(false);
  });

  test('rejects a tag over the per-tag length cap', () => {
    expect(validateScenarioDraft({ ...validInput, tags: 'x'.repeat(41) }).ok).toBe(false);
  });

  test('rejects a non-UUID orgId', () => {
    expect(validateScenarioDraft({ ...validInput, orgId: 'not-a-uuid' }).ok).toBe(false);
  });

  test('accepts a null orgId (personal scenario)', () => {
    const res = validateScenarioDraft({ ...validInput, orgId: null });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.draft.orgId).toBeNull();
  });
});
