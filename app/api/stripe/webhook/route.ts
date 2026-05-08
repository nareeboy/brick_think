import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';

import { handleStripeEvent } from '@/lib/billing/events';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/billing/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new NextResponse('Missing Stripe-Signature header', { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new NextResponse(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err: unknown) {
    console.error('Stripe webhook handler error', { type: event.type, err });
    return new NextResponse('Webhook handler error', { status: 500 });
  }

  return NextResponse.json({ received: true, type: event.type });
}
