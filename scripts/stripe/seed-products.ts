import Stripe from 'stripe';

interface PlanFixture {
  tier: 'pro' | 'team';
  name: string;
  description: string;
  // Test-mode placeholder GBP pricing; the real numbers come after market research.
  monthlyAmountPence: number;
}

const FIXTURES: readonly PlanFixture[] = [
  {
    tier: 'pro',
    name: 'BrickThink Pro',
    description:
      'Per-facilitator subscription with sync and async sessions, AI summaries, custom prompts.',
    monthlyAmountPence: 1500,
  },
  {
    tier: 'team',
    name: 'BrickThink Team',
    description:
      'Per-seat subscription with shared prompt library, co-facilitation, branded exports, SSO.',
    monthlyAmountPence: 2500,
  },
];

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env var: ${name}. Drop your test-mode key in .env.local and re-run.`);
    process.exit(1);
  }
  return value;
}

async function findProductForTier(
  stripe: Stripe,
  tier: PlanFixture['tier'],
): Promise<Stripe.Product | null> {
  let starting: string | undefined;
  while (true) {
    const params: Stripe.ProductListParams = {
      limit: 100,
      active: true,
    };
    if (starting !== undefined) params.starting_after = starting;
    const page = await stripe.products.list(params);
    const match = page.data.find((p) => p.metadata?.plan_tier === tier);
    if (match) return match;
    if (!page.has_more) return null;
    const last = page.data.at(-1);
    if (!last) return null;
    starting = last.id;
  }
}

async function ensureProduct(stripe: Stripe, fixture: PlanFixture): Promise<Stripe.Product> {
  const existing = await findProductForTier(stripe, fixture.tier);
  if (existing) {
    console.warn(`product:${fixture.tier} already exists as ${existing.id}`);
    return existing;
  }
  const product = await stripe.products.create({
    name: fixture.name,
    description: fixture.description,
    metadata: { plan_tier: fixture.tier },
  });
  console.warn(`product:${fixture.tier} created as ${product.id}`);
  return product;
}

async function ensurePrice(
  stripe: Stripe,
  product: Stripe.Product,
  fixture: PlanFixture,
): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: product.id, limit: 100, active: true });
  const existing = prices.data.find(
    (p) =>
      p.recurring?.interval === 'month' &&
      p.unit_amount === fixture.monthlyAmountPence &&
      p.currency === 'gbp' &&
      p.metadata?.plan_tier === fixture.tier,
  );
  if (existing) {
    console.warn(
      `price:${fixture.tier} already exists as ${existing.id} (${fixture.monthlyAmountPence}p)`,
    );
    return existing;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: fixture.monthlyAmountPence,
    recurring: { interval: 'month' },
    metadata: { plan_tier: fixture.tier },
  });
  console.warn(`price:${fixture.tier} created as ${price.id} (${fixture.monthlyAmountPence}p)`);
  return price;
}

async function main(): Promise<void> {
  const stripe = new Stripe(readEnv('STRIPE_SECRET_KEY'), { typescript: true });
  for (const fixture of FIXTURES) {
    const product = await ensureProduct(stripe, fixture);
    await ensurePrice(stripe, product, fixture);
  }
  console.warn('Stripe fixtures synced.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
