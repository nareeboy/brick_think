import { describe, expect, it } from 'vitest';
import { isSubscriptionEntitled } from './entitlements';

const NOW = new Date('2026-06-08T00:00:00Z');
const FUTURE = '2026-07-08T00:00:00Z';
const PAST = '2026-05-08T00:00:00Z';

describe('isSubscriptionEntitled', () => {
  it('false when no row', () => {
    expect(isSubscriptionEntitled(null, NOW)).toBe(false);
  });
  it('true for active within period', () => {
    expect(isSubscriptionEntitled({ status: 'active', current_period_end: FUTURE }, NOW)).toBe(
      true,
    );
  });
  it('true for trialing within period', () => {
    expect(isSubscriptionEntitled({ status: 'trialing', current_period_end: FUTURE }, NOW)).toBe(
      true,
    );
  });
  it('false for active but period elapsed', () => {
    expect(isSubscriptionEntitled({ status: 'active', current_period_end: PAST }, NOW)).toBe(false);
  });
  it('false for past_due / canceled', () => {
    expect(isSubscriptionEntitled({ status: 'past_due', current_period_end: FUTURE }, NOW)).toBe(
      false,
    );
    expect(isSubscriptionEntitled({ status: 'canceled', current_period_end: FUTURE }, NOW)).toBe(
      false,
    );
  });
  it('true for active with null period_end (treat as open)', () => {
    expect(isSubscriptionEntitled({ status: 'active', current_period_end: null }, NOW)).toBe(true);
  });
  it('false when period_end exactly equals now (strict boundary)', () => {
    expect(
      isSubscriptionEntitled({ status: 'active', current_period_end: NOW.toISOString() }, NOW),
    ).toBe(false);
  });
});
