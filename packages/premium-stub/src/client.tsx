import type { PricingLinkSlotProps } from './types';

/**
 * Client-safe slot stubs. Everything exported here must stay importable from
 * `'use client'` components — the real overlay module carries a `'use client'`
 * directive so a server-only import can never sneak in on the hosted build.
 * Server-rendered slots (report actions, branding, nav) live in
 * `./server-slots` instead.
 */

/** Stub: no hosted /pricing route on the open core → render no marketing link. */
export function PricingLinkSlot(_props: PricingLinkSlotProps): null {
  return null;
}
