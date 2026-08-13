'use client';

// Client-safe premium slots only. The 'use client' directive (mirrored by the
// real overlay module) pins this seam to the client graph, so an overlay edit
// that pulls in server-only code fails the hosted build immediately instead of
// waiting for a consumer to gain 'use client'. Server-rendered slots live in
// './server-slots'.
export { PricingLinkSlot } from '@brickthink/premium/client';
export type { PricingLinkSlotProps } from '@brickthink/premium';
