import { describe, expect, test } from 'vitest';

import { isValidPublishedDateInput, publishedDateToInstant } from './publishedDate';

describe('isValidPublishedDateInput', () => {
  test('empty string is valid (means "no change")', () => {
    expect(isValidPublishedDateInput('')).toBe(true);
  });

  test('well-formed real date is valid', () => {
    expect(isValidPublishedDateInput('2026-05-31')).toBe(true);
  });

  test('rejects wrong format', () => {
    expect(isValidPublishedDateInput('31/05/2026')).toBe(false);
    expect(isValidPublishedDateInput('2026-5-31')).toBe(false);
    expect(isValidPublishedDateInput('2026-05-31T00:00:00Z')).toBe(false);
    expect(isValidPublishedDateInput('not-a-date')).toBe(false);
  });

  test('rejects impossible calendar dates', () => {
    expect(isValidPublishedDateInput('2026-02-30')).toBe(false);
    expect(isValidPublishedDateInput('2026-13-01')).toBe(false);
    expect(isValidPublishedDateInput('2026-00-10')).toBe(false);
  });
});

describe('publishedDateToInstant', () => {
  test('maps a date to the noon-UTC instant of that calendar day', () => {
    expect(publishedDateToInstant('2026-05-31')).toBe('2026-05-31T12:00:00.000Z');
  });
});
