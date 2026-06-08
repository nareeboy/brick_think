import { afterEach, describe, expect, it } from 'vitest';
import { isBillingEnabled } from './env';

const ORIG = { ...process.env };
afterEach(() => {
  process.env = { ...ORIG };
});

describe('isBillingEnabled', () => {
  it('is false when BILLING_ENABLED is unset', () => {
    delete process.env.BILLING_ENABLED;
    delete process.env.STRIPE_SECRET_KEY;
    expect(isBillingEnabled()).toBe(false);
  });

  it('is false when BILLING_ENABLED=true but Stripe key missing', () => {
    process.env.BILLING_ENABLED = 'true';
    delete process.env.STRIPE_SECRET_KEY;
    expect(isBillingEnabled()).toBe(false);
  });

  it('is true only when BILLING_ENABLED=true AND Stripe key present', () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    expect(isBillingEnabled()).toBe(true);
  });
});
