import 'server-only';
import type Stripe from 'stripe';

import { getServiceSupabaseClient } from '@/lib/db/service';

import { getStripeClient } from './stripe';

const PLAN_TIER_VALUES = ['free', 'pro', 'team', 'enterprise'] as const;
type PlanTier = (typeof PLAN_TIER_VALUES)[number];

const SUB_STATUS_VALUES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const;
type SubStatus = (typeof SUB_STATUS_VALUES)[number];

function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === 'string' && (PLAN_TIER_VALUES as readonly string[]).includes(value);
}

function isSubStatus(value: unknown): value is SubStatus {
  return typeof value === 'string' && (SUB_STATUS_VALUES as readonly string[]).includes(value);
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer): string | null {
  if (typeof value === 'string') return value;
  if (value.deleted) return null;
  return value.id;
}

interface PeriodTimestamps {
  start: string | null;
  end: string | null;
}

// Stripe API >= 2025-09-30.clover stores billing periods on each item; older
// versions stored them on the subscription. Read both and prefer the item.
function periodTimestamps(
  sub: Stripe.Subscription,
  item: Stripe.SubscriptionItem,
): PeriodTimestamps {
  const itemRaw = item as unknown as Record<string, number | undefined>;
  const subRaw = sub as unknown as Record<string, number | undefined>;
  const start = itemRaw['current_period_start'] ?? subRaw['current_period_start'];
  const end = itemRaw['current_period_end'] ?? subRaw['current_period_end'];
  return {
    start: typeof start === 'number' ? new Date(start * 1000).toISOString() : null,
    end: typeof end === 'number' ? new Date(end * 1000).toISOString() : null,
  };
}

async function findOrgIdForCustomer(customerId: string): Promise<string | null> {
  const stripe = getStripeClient();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const value = customer.metadata?.['org_id'];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function planIdForPrice(price: Stripe.Price): Promise<string | null> {
  const tier = price.metadata?.['plan_tier'];
  if (!isPlanTier(tier)) return null;

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase.from('plans').select('id').eq('tier', tier).maybeSingle();

  if (error) throw error;
  const row = data as { id: string } | null;
  return row?.id ?? null;
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = customerIdFrom(sub.customer);
  if (!customerId) return;

  const orgId = await findOrgIdForCustomer(customerId);
  if (!orgId) return;

  const item = sub.items.data[0];
  if (!item) return;

  const planId = await planIdForPrice(item.price);
  const status: SubStatus = isSubStatus(sub.status) ? sub.status : 'incomplete';
  const periods = periodTimestamps(sub, item);

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from('stripe_subscriptions').upsert(
    {
      org_id: orgId,
      stripe_subscription_id: sub.id,
      stripe_price_id: item.price.id,
      plan_id: planId,
      status,
      current_period_start: periods.start,
      current_period_end: periods.end,
      cancel_at_period_end: sub.cancel_at_period_end,
      raw: sub as unknown as Record<string, unknown>,
    },
    { onConflict: 'stripe_subscription_id' },
  );
  if (error) throw error;

  if (planId && (status === 'active' || status === 'trialing')) {
    const { error: orgError } = await supabase
      .from('organisations')
      .update({ plan_id: planId })
      .eq('id', orgId);
    if (orgError) throw orgError;
  }
}

async function markSubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from('stripe_subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', sub.id);
  if (error) throw error;
}

async function syncCustomerLink(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.customer) return;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;

  const orgFromSession = session.metadata?.['org_id'];
  const orgId =
    (typeof orgFromSession === 'string' && orgFromSession) ||
    (await findOrgIdForCustomer(customerId));
  if (!orgId) return;

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from('stripe_customers')
    .upsert({ org_id: orgId, stripe_customer_id: customerId }, { onConflict: 'org_id' });
  if (error) throw error;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object);
      return;
    case 'customer.subscription.deleted':
      await markSubscriptionCanceled(event.data.object);
      return;
    case 'checkout.session.completed':
      await syncCustomerLink(event.data.object);
      return;
    default:
      // Unhandled events are a no-op; Stripe will not retry once we 200.
      return;
  }
}
