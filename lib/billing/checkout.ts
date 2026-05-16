import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

import { priceIdForTier, type PurchaseableTier } from './plans';
import { getStripeClient } from './stripe';

interface CreateCheckoutInput {
  orgId: string;
  orgName: string;
  tier: PurchaseableTier;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create (or reuse) the Stripe customer for an org and start a Checkout
 * session in `subscription` mode. The customer's `metadata.org_id` is the
 * canonical link the webhook uses to upsert `stripe_customers` and
 * `stripe_subscriptions`.
 */
export async function createCheckoutSession(input: CreateCheckoutInput): Promise<string> {
  const stripe = getStripeClient();
  const supabase = getServiceSupabaseClient();

  const existing = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('org_id', input.orgId)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`Failed to look up Stripe customer: ${existing.error.message}`);
  }

  let customerId = (existing.data as { stripe_customer_id: string } | null)?.stripe_customer_id;
  if (!customerId) {
    const created = await stripe.customers.create({
      email: input.userEmail,
      name: input.orgName,
      metadata: { org_id: input.orgId },
    });
    customerId = created.id;
    const upsert = await supabase
      .from('stripe_customers')
      .upsert(
        { org_id: input.orgId, stripe_customer_id: customerId },
        { onConflict: 'org_id' },
      );
    if (upsert.error) {
      throw new Error(`Failed to persist Stripe customer: ${upsert.error.message}`);
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: input.orgId,
    line_items: [{ price: priceIdForTier(input.tier), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { org_id: input.orgId, tier: input.tier },
    subscription_data: {
      metadata: { org_id: input.orgId },
    },
  });

  if (!session.url) throw new Error('Stripe returned a checkout session without a URL');
  return session.url;
}
