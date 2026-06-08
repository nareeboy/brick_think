import 'server-only';
import { isBillingEnabled } from './env';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';
import { type Tier, TIERS, hasTierRank, maxTier } from './plans';

const ENTITLED_STATUSES = new Set(['active', 'trialing']);
const TIER_SET = new Set<string>(TIERS);

export interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
  tier: string | null;
}

/** Pure rule — the active subscription's tier, or null. Unit-testable, no I/O. */
export function subscriptionTierFromRow(row: SubscriptionRow | null, now: Date): Tier | null {
  if (!row) return null;
  if (!ENTITLED_STATUSES.has(row.status)) return null;
  if (!row.tier || !TIER_SET.has(row.tier)) return null;
  if (row.current_period_end !== null && new Date(row.current_period_end).getTime() <= now.getTime())
    return null;
  return row.tier as Tier;
}

/** Subscription tier for a facilitator (across all sessions). Billing off → top tier. */
export async function subscriptionTier(facilitatorId: string): Promise<Tier | null> {
  if (!isBillingEnabled()) return 'full_findings';
  const svc = createServiceRoleSupabaseClient();
  const { data, error } = await svc
    .from('facilitator_subscriptions')
    .select('status, current_period_end, tier')
    .eq('profile_id', facilitatorId)
    .maybeSingle();
  if (error) {
    console.error('[billing] subscriptionTier lookup failed', error);
    return null; // fail closed
  }
  return subscriptionTierFromRow(data, new Date());
}

/** Tier purchased one-time for a specific session, or null. Billing off → top tier. */
export async function sessionPurchaseTier(
  facilitatorId: string,
  sessionId: string,
): Promise<Tier | null> {
  if (!isBillingEnabled()) return 'full_findings';
  const svc = createServiceRoleSupabaseClient();
  const { data, error } = await svc
    .from('session_purchases')
    .select('tier, status')
    .eq('profile_id', facilitatorId)
    .eq('session_id', sessionId)
    .eq('status', 'paid')
    .maybeSingle();
  if (error) {
    console.error('[billing] sessionPurchaseTier lookup failed', error);
    return null;
  }
  if (!data?.tier || !TIER_SET.has(data.tier)) return null;
  return data.tier as Tier;
}

/**
 * Highest tier the facilitator holds for a given session = max(subscription, per-session).
 * Per-session is only consulted when sessionId is provided.
 */
export async function entitledTier(
  facilitatorId: string,
  sessionId?: string,
): Promise<Tier | null> {
  const sub = await subscriptionTier(facilitatorId);
  if (!sessionId) return sub;
  const once = await sessionPurchaseTier(facilitatorId, sessionId);
  return maxTier(sub, once);
}

export { hasTierRank };

/** Back-compat boolean: does the facilitator hold ANY paid subscription tier? */
export async function isEntitled(facilitatorId: string): Promise<boolean> {
  return (await subscriptionTier(facilitatorId)) !== null;
}
