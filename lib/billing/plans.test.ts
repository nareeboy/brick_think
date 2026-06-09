import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TIERS, TIER_RANK, hasTierRank, priceCatalog, priceIdFor, tierMetaFor } from './plans';

const ENV_KEYS = [
  'STRIPE_PRICE_SESSION_REPORT_ONCE',
  'STRIPE_PRICE_SESSION_REPORT_MONTHLY',
  'STRIPE_PRICE_SESSION_REPORT_YEARLY',
  'STRIPE_PRICE_CLIENT_READY_ONCE',
  'STRIPE_PRICE_CLIENT_READY_MONTHLY',
  'STRIPE_PRICE_CLIENT_READY_YEARLY',
  'STRIPE_PRICE_FULL_FINDINGS_ONCE',
  'STRIPE_PRICE_FULL_FINDINGS_MONTHLY',
  'STRIPE_PRICE_FULL_FINDINGS_YEARLY',
];

describe('plans catalog', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    ENV_KEYS.forEach((k, i) => {
      saved[k] = process.env[k];
      process.env[k] = `price_${i}`;
    });
  });
  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('orders tiers and ranks them', () => {
    expect(TIERS).toEqual(['session_report', 'client_ready', 'full_findings']);
    expect(TIER_RANK.full_findings).toBeGreaterThan(TIER_RANK.client_ready);
    expect(TIER_RANK.client_ready).toBeGreaterThan(TIER_RANK.session_report);
  });

  it('hasTierRank compares held vs required, null is below everything', () => {
    expect(hasTierRank('client_ready', 'session_report')).toBe(true);
    expect(hasTierRank('session_report', 'client_ready')).toBe(false);
    expect(hasTierRank(null, 'session_report')).toBe(false);
    expect(hasTierRank('full_findings', 'full_findings')).toBe(true);
  });

  it('round-trips price id ↔ {tier, mode}', () => {
    const cat = priceCatalog();
    expect(cat['price_0']).toEqual({ tier: 'session_report', mode: 'once' });
    expect(cat['price_4']).toEqual({ tier: 'client_ready', mode: 'monthly' });
    expect(priceIdFor('full_findings', 'yearly')).toBe('price_8');
  });

  it('exposes display metadata with EUR prices', () => {
    const meta = tierMetaFor('session_report');
    expect(meta.name).toBe('Session Report');
    expect(meta.prices.monthly.amount).toBe(29);
    expect(meta.prices.once.amount).toBe(9);
  });
});
