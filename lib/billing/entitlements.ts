import 'server-only';
import { isBillingEnabled } from './env';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

const ENTITLED_STATUSES = new Set(['active', 'trialing']);

export interface SubscriptionRow {
  status: string;
  current_period_end: string | null;
}

/** Pure entitlement rule — unit-testable, no I/O. */
export function isSubscriptionEntitled(row: SubscriptionRow | null, now: Date): boolean {
  if (!row) return false;
  if (!ENTITLED_STATUSES.has(row.status)) return false;
  if (row.current_period_end === null) return true; // open-ended active sub
  return new Date(row.current_period_end).getTime() > now.getTime();
}

/**
 * Single source of truth for whether a facilitator may use the paid features.
 * Billing disabled (self-host / dev / E2E) → always true. Enabled → read the
 * webhook-maintained subscription row.
 */
export async function isEntitled(facilitatorId: string): Promise<boolean> {
  if (!isBillingEnabled()) return true;
  const svc = createServiceRoleSupabaseClient();
  const { data } = await svc
    .from('facilitator_subscriptions')
    .select('status, current_period_end')
    .eq('profile_id', facilitatorId)
    .maybeSingle();
  return isSubscriptionEntitled(data, new Date());
}
