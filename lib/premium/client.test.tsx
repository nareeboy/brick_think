import { describe, expect, it } from 'vitest';

import { PricingLinkSlot } from './client';

// NB: this asserts the OPEN-CORE stub. With the premium overlay applied the
// real slot renders a link and this test fails — a known artifact; run the
// unit suite from a clean checkout.
describe('PricingLinkSlot (open-core stub)', () => {
  it('renders nothing — the open core has no hosted /pricing route', () => {
    expect(PricingLinkSlot({ variant: 'nav' })).toBeNull();
    expect(PricingLinkSlot({ variant: 'footer' })).toBeNull();
  });
});
