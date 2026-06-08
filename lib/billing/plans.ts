import 'server-only';

export const TIERS = ['session_report', 'client_ready', 'full_findings'] as const;
export type Tier = (typeof TIERS)[number];
export type BillingMode = 'once' | 'monthly' | 'yearly';

export const TIER_RANK: Record<Tier, number> = {
  session_report: 1,
  client_ready: 2,
  full_findings: 3,
};

/** Is `held` at or above `required`? null (no entitlement) is below every tier. */
export function hasTierRank(held: Tier | null, required: Tier): boolean {
  if (!held) return false;
  return TIER_RANK[held] >= TIER_RANK[required];
}

/** Highest of two tiers (either may be null). */
export function maxTier(a: Tier | null, b: Tier | null): Tier | null {
  if (!a) return b;
  if (!b) return a;
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

const ENV_KEY: Record<Tier, Record<BillingMode, string>> = {
  session_report: {
    once: 'STRIPE_PRICE_SESSION_REPORT_ONCE',
    monthly: 'STRIPE_PRICE_SESSION_REPORT_MONTHLY',
    yearly: 'STRIPE_PRICE_SESSION_REPORT_YEARLY',
  },
  client_ready: {
    once: 'STRIPE_PRICE_CLIENT_READY_ONCE',
    monthly: 'STRIPE_PRICE_CLIENT_READY_MONTHLY',
    yearly: 'STRIPE_PRICE_CLIENT_READY_YEARLY',
  },
  full_findings: {
    once: 'STRIPE_PRICE_FULL_FINDINGS_ONCE',
    monthly: 'STRIPE_PRICE_FULL_FINDINGS_MONTHLY',
    yearly: 'STRIPE_PRICE_FULL_FINDINGS_YEARLY',
  },
};

export interface PriceRef {
  tier: Tier;
  mode: BillingMode;
}

/** price_id → {tier, mode} for every configured price (skips unset env). */
export function priceCatalog(): Record<string, PriceRef> {
  const out: Record<string, PriceRef> = {};
  for (const tier of TIERS) {
    for (const mode of ['once', 'monthly', 'yearly'] as BillingMode[]) {
      const id = process.env[ENV_KEY[tier][mode]];
      if (id && id.length > 0) out[id] = { tier, mode };
    }
  }
  return out;
}

/** Resolve the configured Stripe price id for a (tier, mode); throws if unset. */
export function priceIdFor(tier: Tier, mode: BillingMode): string {
  const id = process.env[ENV_KEY[tier][mode]];
  if (!id) throw new Error(`Missing ${ENV_KEY[tier][mode]}`);
  return id;
}

/** Reverse lookup used by the webhook. */
export function tierForPriceId(priceId: string): PriceRef | null {
  return priceCatalog()[priceId] ?? null;
}

export interface TierPrice {
  amount: number; // EUR, whole units
  stripeUnitAmount: number; // cents, for the Stripe setup runbook
}
export interface TierMeta {
  key: Tier;
  name: string;
  tagline: string;
  bullets: string[];
  prices: Record<BillingMode, TierPrice>;
}

const TIER_META: Record<Tier, TierMeta> = {
  session_report: {
    key: 'session_report',
    name: 'Session Report',
    tagline: 'The convenience version of what is already free — no Anthropic key to manage.',
    bullets: [
      'Hosted PDF session report',
      'Automatic transcript cleanup',
      'No Anthropic key setup — BrickThink covers the AI cost',
    ],
    prices: {
      once: { amount: 9, stripeUnitAmount: 900 },
      monthly: { amount: 29, stripeUnitAmount: 2900 },
      yearly: { amount: 290, stripeUnitAmount: 29000 },
    },
  },
  client_ready: {
    key: 'client_ready',
    name: 'Client-Ready',
    tagline: 'A branded deliverable for the facilitator billing a client.',
    bullets: ['Everything in Session Report', 'Fully white-labelled — your logo, colours, name'],
    prices: {
      once: { amount: 45, stripeUnitAmount: 4500 },
      monthly: { amount: 119, stripeUnitAmount: 11900 },
      yearly: { amount: 1190, stripeUnitAmount: 119000 },
    },
  },
  full_findings: {
    key: 'full_findings',
    name: 'Full Findings',
    tagline: 'The full written report with synthesised findings and suggestions.',
    bullets: [
      'Everything in Client-Ready',
      'Full written report with synthesised findings & suggestions',
    ],
    prices: {
      once: { amount: 60, stripeUnitAmount: 6000 },
      monthly: { amount: 159, stripeUnitAmount: 15900 },
      yearly: { amount: 1590, stripeUnitAmount: 159000 },
    },
  },
};

export function tierMetaFor(tier: Tier): TierMeta {
  return TIER_META[tier];
}
export function allTierMeta(): TierMeta[] {
  return TIERS.map((t) => TIER_META[t]);
}
