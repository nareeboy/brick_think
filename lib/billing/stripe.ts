import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getStripeClient(): Stripe {
  if (cached) return cached;
  cached = new Stripe(readEnv('STRIPE_SECRET_KEY'), {
    appInfo: { name: 'BrickThink', version: '0.0.0' },
    typescript: true,
  });
  return cached;
}

export function getStripeWebhookSecret(): string {
  return readEnv('STRIPE_WEBHOOK_SECRET');
}
