import { describe, it, expect } from 'vitest';
import { subscriptionTierFromRow } from './entitlements';

describe('subscriptionTierFromRow', () => {
  const now = new Date('2026-06-08T00:00:00Z');
  it('returns null for no row', () => {
    expect(subscriptionTierFromRow(null, now)).toBeNull();
  });
  it('returns the row tier for an active sub with future period end', () => {
    expect(
      subscriptionTierFromRow(
        { status: 'active', current_period_end: '2026-07-08T00:00:00Z', tier: 'client_ready' },
        now,
      ),
    ).toBe('client_ready');
  });
  it('returns null for a cancelled sub', () => {
    expect(
      subscriptionTierFromRow(
        { status: 'canceled', current_period_end: null, tier: 'full_findings' },
        now,
      ),
    ).toBeNull();
  });
  it('returns null when the period has lapsed', () => {
    expect(
      subscriptionTierFromRow(
        { status: 'active', current_period_end: '2026-05-08T00:00:00Z', tier: 'session_report' },
        now,
      ),
    ).toBeNull();
  });
  it('honours open-ended active subs (null period end)', () => {
    expect(
      subscriptionTierFromRow(
        { status: 'trialing', current_period_end: null, tier: 'session_report' },
        now,
      ),
    ).toBe('session_report');
  });
  it('returns null when status is active but tier is missing (legacy row)', () => {
    expect(
      subscriptionTierFromRow({ status: 'active', current_period_end: null, tier: null }, now),
    ).toBeNull();
  });
});
