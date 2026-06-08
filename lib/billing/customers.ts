import 'server-only';
import { getStripe } from './stripe';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

/** Return the facilitator's Stripe customer id, creating + persisting it once. */
export async function getOrCreateStripeCustomer(
  facilitatorId: string,
  email: string,
): Promise<string> {
  const svc = createServiceRoleSupabaseClient();
  const existing = await svc
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('profile_id', facilitatorId)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`stripe_customers lookup failed: ${existing.error.message}`);
  }
  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { profile_id: facilitatorId },
  });
  const insert = await svc
    .from('stripe_customers')
    .insert({ profile_id: facilitatorId, stripe_customer_id: customer.id });
  if (insert.error) {
    // A concurrent checkout for the same facilitator may have inserted first
    // (profile_id PK / stripe_customer_id unique). Re-select and use the winner
    // rather than failing — keeps the checkout entry point idempotent.
    const raced = await svc
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('profile_id', facilitatorId)
      .maybeSingle();
    if (raced.data?.stripe_customer_id) return raced.data.stripe_customer_id;
    throw new Error(`stripe_customers insert failed: ${insert.error.message}`);
  }
  return customer.id;
}
