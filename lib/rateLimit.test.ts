import { beforeEach, describe, expect, it } from 'vitest';

import { __resetRateLimitForTests, consumeRateLimit } from './rateLimit';

describe('consumeRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it('allows up to the limit within the window', () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const result = consumeRateLimit('k', 5, 10_000, now);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('rejects the next call after the limit and reports retryAfterMs', () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) {
      consumeRateLimit('k', 3, 10_000, now);
    }
    const result = consumeRateLimit('k', 3, 10_000, now + 4_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(6_000);
    expect(result.remaining).toBe(0);
  });

  it('opens a new window after the previous one expires', () => {
    const now = 1_000_000;
    consumeRateLimit('k', 1, 10_000, now);
    expect(consumeRateLimit('k', 1, 10_000, now + 5_000).allowed).toBe(false);
    expect(consumeRateLimit('k', 1, 10_000, now + 11_000).allowed).toBe(true);
  });

  it('isolates buckets by key', () => {
    const now = 1_000_000;
    consumeRateLimit('a', 1, 10_000, now);
    expect(consumeRateLimit('a', 1, 10_000, now).allowed).toBe(false);
    expect(consumeRateLimit('b', 1, 10_000, now).allowed).toBe(true);
  });
});
