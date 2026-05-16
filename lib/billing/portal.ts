import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

import { getStripeClient } from './stripe';

interface CreatePortalInput {
  orgId: string;
  returnUrl: string;
}

export type PortalResult =
  | { kind: 'ok'; url: string }
  | { kind: 'no_customer' };

/**
 * Open a Stripe Billing Portal session for the org's customer. Returns
 * `no_customer` when the org has never been through Checkout — the UI offers
 * "Upgrade" instead in that case.
 */
export async function createPortalSession(input: CreatePortalInput): Promise<PortalResult> {
  const supabase = getServiceSupabaseClient();
  const customerRes = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('org_id', input.orgId)
    .maybeSingle();
  if (customerRes.error) {
    throw new Error(`Failed to look up Stripe customer: ${customerRes.error.message}`);
  }
  const customer = customerRes.data as { stripe_customer_id: string } | null;
  if (!customer) return { kind: 'no_customer' };

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: input.returnUrl,
  });

  return { kind: 'ok', url: session.url };
}
