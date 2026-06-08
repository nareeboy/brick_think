import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { isBillingEnabled, requireStripeWebhookSecret } from '@/lib/billing/env';
import { getStripe } from '@/lib/billing/stripe';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';
import { tierForPriceId } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function periodEndIso(sub: Stripe.Subscription): string | null {
  // Single-Price subscription (checkout creates exactly one line item), so the
  // billing period lives on the first/only item. Stripe v22 moved current_period_end
  // off the top-level Subscription onto each item.
  const epochSeconds = sub.items.data[0]?.current_period_end;
  return typeof epochSeconds === 'number' ? new Date(epochSeconds * 1000).toISOString() : null;
}

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const svc = createServiceRoleSupabaseClient();

  let profileId = typeof sub.metadata?.profile_id === 'string' ? sub.metadata.profile_id : null;
  if (!profileId) {
    // Fallback: resolve profile via the stored customer id.
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const cust = await svc
      .from('stripe_customers')
      .select('profile_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (cust.error) {
      // Transient read failure — throw so Stripe retries rather than dropping the event.
      throw new Error(`stripe_customers lookup failed: ${cust.error.message}`);
    }
    profileId = cust.data?.profile_id ?? null;
  }
  if (!profileId) {
    console.error('[stripe webhook] could not resolve profile_id for subscription', sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? null;
  const tier = priceId ? (tierForPriceId(priceId)?.tier ?? null) : null;

  const upsert = await svc.from('facilitator_subscriptions').upsert(
    {
      profile_id: profileId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      tier,
      current_period_end: periodEndIso(sub),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );
  if (upsert.error) {
    throw new Error(`facilitator_subscriptions upsert failed: ${upsert.error.message}`);
  }
}

async function recordSessionPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const md = session.metadata ?? {};
  const profileId =
    (typeof md.profile_id === 'string' && md.profile_id) || session.client_reference_id || null;
  const sessionId = typeof md.session_id === 'string' ? md.session_id : null;
  const tier = typeof md.tier === 'string' ? md.tier : null;
  if (!profileId || !sessionId || !tier) {
    console.error('[stripe webhook] payment checkout missing metadata', session.id);
    return;
  }
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const svc = createServiceRoleSupabaseClient();
  const upsert = await svc.from('session_purchases').upsert(
    {
      profile_id: profileId,
      session_id: sessionId,
      tier,
      status: 'paid',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
    },
    { onConflict: 'profile_id,session_id' },
  );
  if (upsert.error) {
    throw new Error(`session_purchases upsert failed: ${upsert.error.message}`);
  }
}

export async function POST(request: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: 'billing_disabled' }, { status: 404 });
  }
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'no_signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, requireStripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const evtSub = event.data.object as Stripe.Subscription;
        // Events can arrive out of order; re-fetch current state so a stale
        // 'updated' delivered after 'deleted' can't resurrect entitlement.
        const sub: Stripe.Subscription = await getStripe().subscriptions.retrieve(evtSub.id);
        await upsertSubscription(sub);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          await recordSessionPurchase(session);
          break;
        }
        if (session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const sub: Stripe.Subscription = await getStripe().subscriptions.retrieve(subId);
          if (
            session.client_reference_id &&
            sub.metadata?.profile_id !== session.client_reference_id
          ) {
            await getStripe().subscriptions.update(subId, {
              metadata: {
                profile_id: session.client_reference_id,
                ...(sub.metadata?.tier ? { tier: sub.metadata.tier } : {}),
              },
            });
            sub.metadata = { ...sub.metadata, profile_id: session.client_reference_id };
          }
          await upsertSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', err);
    return NextResponse.json({ error: 'handler_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
