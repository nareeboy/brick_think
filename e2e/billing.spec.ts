// e2e/billing.spec.ts
//
// Open-source / self-host guarantee, end-to-end.
//
// The local E2E stack runs billing DISABLED — .env.test sets neither
// BILLING_ENABLED nor STRIPE_SECRET_KEY, so lib/billing/env.ts
// isBillingEnabled() is false (and isEntitled() returns true for everyone).
// Flipping the flag per-request would need a production entitlement backdoor on
// the paywall path (unacceptable) or a second billing-enabled build. The ENABLED
// gate (upgrade_required + UpgradeModal upsell) is already proven end-to-end at
// the integration layer (tests/integration/narration-cleanup-gate +
// report-generate-gate flip BILLING_ENABLED and exercise the real isEntitled
// both ways). So this spec proves the complementary, critical-for-open-core
// property: a self-hosted / billing-disabled BrickThink gives users the FULL
// app with NO paywall UI, while the public pricing page still renders.
//
// What this covers:
//   1. Public /pricing renders (no auth): the "Pricing" eyebrow, the
//      cost-recovery message, the three tier names (Session Report,
//      Client-Ready, Full Findings) with a price line, and the primary CTA
//      linking to the billing page behind sign-in.
//   2. Self-host guarantee — /app/account/billing shows the billing-disabled
//      "all features are available for free" copy and NO subscribe / manage
//      buttons.
//   3. No "Subscription" BillingCard on /app/account when billing is disabled
//      (the card returns null).
//
// Copy + hrefs cross-checked against:
//   app/pricing/page.tsx
//   app/(authed)/app/account/billing/page.tsx
//   app/(authed)/app/account/billing/BillingActions.tsx
//   app/(authed)/app/account/BillingCard.tsx
//   lib/billing/env.ts (isBillingEnabled gate)

import { expect, test } from './fixtures';

const BILLING_CTA_HREF = '/sign-in?next=%2Fapp%2Faccount%2Fbilling';

test.describe('billing — open-source / self-host guarantee', () => {
  // /pricing is a public marketing page; being signed in doesn't change it, so
  // reuse signedInPage (which also pre-sets onboarding flags) for a single,
  // consistent page object across all three tests.
  test('public pricing page renders the cost-recovery story', async ({ signedInPage: page }) => {
    await page.goto('/pricing');

    // The "Pricing" eyebrow badge is the page's "Pricing" label (the H1 is now
    // "Free tool. Three tiers that cost us money.").
    await expect(page.getByText('Pricing', { exact: true }).first()).toBeVisible();

    // Cost-recovery, not a tier wall (the dark band copy still holds).
    await expect(page.getByText(/cost-recovery, not a tier wall/i).first()).toBeVisible();

    // The three tier cards are named.
    await expect(page.getByText('Session Report').first()).toBeVisible();
    await expect(page.getByText('Client-Ready').first()).toBeVisible();
    await expect(page.getByText('Full Findings').first()).toBeVisible();

    // Each tier renders a price line — assert the Session Report one.
    await expect(page.getByText(/€9\s*\/\s*session/).first()).toBeVisible();

    // Primary CTA links to the billing page behind sign-in.
    await expect(page.locator(`a[href="${BILLING_CTA_HREF}"]`).first()).toBeVisible();
  });

  test('billing page shows "all features free" with no subscribe/manage buttons', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/account/billing');

    await expect(
      page.getByText(
        'Billing is not enabled on this instance — all features are available for free.',
      ),
    ).toBeVisible();

    // The BillingActions component (Subscribe / Manage) only renders when
    // billing is enabled — it must be entirely absent here.
    await expect(page.getByRole('button', { name: 'Subscribe monthly' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Subscribe annually' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Manage subscription' })).toHaveCount(0);
  });

  test('account page has no Subscription billing card when billing disabled', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/account');

    // BillingCard returns null when billing is disabled — neither its
    // "Subscription" eyebrow (a <p>, not a heading) nor its View plans /
    // Manage subscription CTA link exist.
    await expect(page.getByText('Subscription', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'View plans' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Manage subscription' })).toHaveCount(0);
  });
});
