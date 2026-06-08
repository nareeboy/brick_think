'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isBillingEnabled, requireStripePriceIds } from '@/lib/billing/env';
import { getStripe } from '@/lib/billing/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing/customers';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount%2Fbilling');
  return { supabase, user };
}

async function originUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.length > 0) return configured.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export type BillingActionResult = { ok: true; url: string } | { ok: false; code: string };

export async function createCheckoutSession(
  interval: 'monthly' | 'annual',
): Promise<BillingActionResult> {
  if (!isBillingEnabled()) return { ok: false, code: 'billing_disabled' };
  const { user } = await requireUser();
  if (!user.email) return { ok: false, code: 'no_email' };

  const prices = requireStripePriceIds();
  const price = interval === 'annual' ? prices.annual : prices.monthly;

  try {
    const customerId = await getOrCreateStripeCustomer(user.id, user.email);
    const origin = await originUrl();

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/app/account/billing?success=1`,
      cancel_url: `${origin}/app/account/billing?canceled=1`,
      client_reference_id: user.id,
    });
    if (!session.url) return { ok: false, code: 'no_url' };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error('[billing] checkout session failed', err);
    return { ok: false, code: 'stripe_error' };
  }
}

export async function createPortalSession(): Promise<BillingActionResult> {
  if (!isBillingEnabled()) return { ok: false, code: 'billing_disabled' };
  const { user } = await requireUser();

  const svc = createServiceRoleSupabaseClient();
  const cust = await svc
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!cust.data?.stripe_customer_id) return { ok: false, code: 'no_customer' };

  try {
    const origin = await originUrl();
    const portal = await getStripe().billingPortal.sessions.create({
      customer: cust.data.stripe_customer_id,
      return_url: `${origin}/app/account/billing`,
    });
    return { ok: true, url: portal.url };
  } catch (err) {
    console.error('[billing] portal session failed', err);
    return { ok: false, code: 'stripe_error' };
  }
}
