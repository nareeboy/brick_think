import 'server-only';

function readServer(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Billing is enabled only when explicitly flagged AND Stripe is configured.
 * Self-hosters / local dev / E2E leave BILLING_ENABLED unset → everyone is
 * entitled (see isEntitled). Satisfies CLAUDE.md: never gate on NODE_ENV alone.
 */
export function isBillingEnabled(): boolean {
  return readServer('BILLING_ENABLED') === 'true' && readServer('STRIPE_SECRET_KEY') !== undefined;
}

export interface StripeEnv {
  secretKey: string;
}

export function requireStripeEnv(): StripeEnv {
  const secretKey = readServer('STRIPE_SECRET_KEY');
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return { secretKey };
}

export function requireStripeWebhookSecret(): string {
  const secret = readServer('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  return secret;
}

export interface StripePriceIds {
  monthly: string;
  annual: string;
}

export function requireStripePriceIds(): StripePriceIds {
  const monthly = readServer('STRIPE_PRICE_MONTHLY');
  const annual = readServer('STRIPE_PRICE_ANNUAL');
  if (!monthly || !annual) throw new Error('Missing STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL');
  return { monthly, annual };
}
