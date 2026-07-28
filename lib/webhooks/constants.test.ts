import { describe, expect, it } from 'vitest';

import {
  WEBHOOK_DELAY_MAX_DAYS,
  WEBHOOK_DESCRIPTION_MAX,
  WEBHOOK_TYPE_MAX,
  WEBHOOK_URL_MAX,
  isTriggerType,
  isValidDelayDays,
  isValidWebhookType,
  isValidWebhookUrl,
} from './constants';

describe('isTriggerType', () => {
  it('accepts the two known trigger types', () => {
    expect(isTriggerType('signup')).toBe(true);
    expect(isTriggerType('manual')).toBe(true);
  });

  it('rejects unknown values and non-strings', () => {
    expect(isTriggerType('subscription')).toBe(false);
    expect(isTriggerType('')).toBe(false);
    expect(isTriggerType(null)).toBe(false);
    expect(isTriggerType(42)).toBe(false);
  });
});

describe('isValidWebhookType', () => {
  it('accepts short identifiers', () => {
    expect(isValidWebhookType('Signup')).toBe(true);
    expect(isValidWebhookType('day_7')).toBe(true);
  });

  it('rejects empty / whitespace-only values', () => {
    expect(isValidWebhookType('')).toBe(false);
    expect(isValidWebhookType('   ')).toBe(false);
  });

  it(`rejects values over ${WEBHOOK_TYPE_MAX} characters`, () => {
    expect(isValidWebhookType('a'.repeat(WEBHOOK_TYPE_MAX))).toBe(true);
    expect(isValidWebhookType('a'.repeat(WEBHOOK_TYPE_MAX + 1))).toBe(false);
  });
});

describe('isValidWebhookUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidWebhookUrl('https://hook.eu2.make.com/abc123')).toBe(true);
    expect(isValidWebhookUrl('https://hooks.zapier.com/hooks/catch/1/x/')).toBe(true);
  });

  it('rejects http, other schemes, and garbage', () => {
    expect(isValidWebhookUrl('http://hook.eu2.make.com/abc123')).toBe(false);
    expect(isValidWebhookUrl('ftp://example.com')).toBe(false);
    expect(isValidWebhookUrl('javascript:alert(1)')).toBe(false);
    expect(isValidWebhookUrl('not a url')).toBe(false);
    expect(isValidWebhookUrl('')).toBe(false);
    expect(isValidWebhookUrl('https://')).toBe(false);
  });

  it(`rejects URLs over ${WEBHOOK_URL_MAX} characters`, () => {
    const long = `https://example.com/${'a'.repeat(WEBHOOK_URL_MAX)}`;
    expect(isValidWebhookUrl(long)).toBe(false);
  });
});

describe('isValidDelayDays', () => {
  it('accepts integers within 0..max', () => {
    expect(isValidDelayDays(0)).toBe(true);
    expect(isValidDelayDays(3)).toBe(true);
    expect(isValidDelayDays(WEBHOOK_DELAY_MAX_DAYS)).toBe(true);
  });

  it('rejects negatives, fractions, out-of-range, and NaN', () => {
    expect(isValidDelayDays(-1)).toBe(false);
    expect(isValidDelayDays(1.5)).toBe(false);
    expect(isValidDelayDays(WEBHOOK_DELAY_MAX_DAYS + 1)).toBe(false);
    expect(isValidDelayDays(Number.NaN)).toBe(false);
  });
});

describe('caps', () => {
  it('match the DB CHECK constraints', () => {
    expect(WEBHOOK_TYPE_MAX).toBe(64);
    expect(WEBHOOK_URL_MAX).toBe(2000);
    expect(WEBHOOK_DESCRIPTION_MAX).toBe(500);
    expect(WEBHOOK_DELAY_MAX_DAYS).toBe(365);
  });
});
