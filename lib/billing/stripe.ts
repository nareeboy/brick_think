import 'server-only';
import Stripe from 'stripe';
import { requireStripeEnv } from './env';

let cached: Stripe | null = null;

/** Lazy Stripe singleton. Only constructed on paths where billing is enabled. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const { secretKey } = requireStripeEnv();
  cached = new Stripe(secretKey);
  return cached;
}
