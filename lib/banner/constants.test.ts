// lib/banner/constants.test.ts
import { describe, expect, test } from 'vitest';

import {
  BANNER_TYPES,
  BANNER_TYPE_LABELS,
  BANNER_TYPE_STYLES,
  BANNER_MESSAGE_MAX,
  isBannerType,
} from './constants';

describe('banner constants', () => {
  test('every banner type has a label and a style', () => {
    for (const t of BANNER_TYPES) {
      expect(BANNER_TYPE_LABELS[t]).toBeTruthy();
      expect(BANNER_TYPE_STYLES[t].container).toBeTruthy();
      expect(BANNER_TYPE_STYLES[t].icon).toBeTruthy();
    }
  });

  test('the five expected types exist in dropdown order', () => {
    expect([...BANNER_TYPES]).toEqual(['info', 'warning', 'error', 'success', 'promo']);
  });

  test('isBannerType narrows valid values and rejects others', () => {
    expect(isBannerType('warning')).toBe(true);
    expect(isBannerType('promo')).toBe(true);
    expect(isBannerType('nope')).toBe(false);
    expect(isBannerType('')).toBe(false);
  });

  test('message cap is 280', () => {
    expect(BANNER_MESSAGE_MAX).toBe(280);
  });
});
