import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';

const PURCHASEABLE_TIERS = ['pro', 'team'] as const;
export type PurchaseableTier = (typeof PURCHASEABLE_TIERS)[number];

export function isPurchaseableTier(value: unknown): value is PurchaseableTier {
  return typeof value === 'string' && (PURCHASEABLE_TIERS as readonly string[]).includes(value);
}

export const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
  enterprise: 'Enterprise',
};

export interface OrgPlanState {
  tier: PlanTier;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
}

interface PlanRow {
  tier: PlanTier;
}

interface SubRow {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_id: string | null;
}

/**
 * Resolve an organisation's effective plan. Reads the most recent non-canceled
 * `stripe_subscriptions` row; falls back to `free` when there's no active row.
 * Service-role client to side-step the read RLS — callers must check
 * authorisation (org membership / ownership) themselves.
 */
export async function getOrgPlan(orgId: string): Promise<OrgPlanState> {
  const supabase = getServiceSupabaseClient();

  const [subRes, customerRes] = await Promise.all([
    supabase
      .from('stripe_subscriptions')
      .select('status, current_period_end, cancel_at_period_end, plan_id')
      .eq('org_id', orgId)
      .neq('status', 'canceled')
      .order('current_period_end', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .maybeSingle(),
  ]);
  if (subRes.error) throw new Error(`Failed to read subscription: ${subRes.error.message}`);
  if (customerRes.error) throw new Error(`Failed to read customer: ${customerRes.error.message}`);

  const hasStripeCustomer = customerRes.data !== null;
  const sub = subRes.data as SubRow | null;
  if (!sub) {
    return {
      tier: 'free',
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      hasStripeCustomer,
    };
  }

  let tier: PlanTier = 'free';
  if (sub.plan_id) {
    const planRes = await supabase.from('plans').select('tier').eq('id', sub.plan_id).maybeSingle();
    if (planRes.error) throw new Error(`Failed to read plan: ${planRes.error.message}`);
    const planRow = planRes.data as PlanRow | null;
    if (planRow?.tier) tier = planRow.tier;
  }

  return {
    tier,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    hasStripeCustomer,
  };
}

/**
 * Map a purchaseable tier to the Stripe price id seeded by
 * scripts/stripe/seed-products.ts. The env vars are populated at deploy time
 * (see .env.example) — listing prices live on every request is too slow.
 */
export function priceIdForTier(tier: PurchaseableTier): string {
  const key = tier === 'pro' ? 'STRIPE_PRICE_PRO_GBP' : 'STRIPE_PRICE_TEAM_GBP';
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}
