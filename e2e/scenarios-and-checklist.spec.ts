// e2e/scenarios-and-checklist.spec.ts
//
// Phase-1 scenario library + pre-session checklist (PRD §9.2). Two specs:
//   1. The /app/scenarios library renders all 20 seeds, filters narrow,
//      and the detail modal opens.
//   2. A facilitator on a fresh session picks a scenario for every stage,
//      writes a long-enough brief, and ticks the a11y row — the
//      "Ready to start" pill appears.

import { expect, test } from './fixtures';

test.describe('Scenarios library', () => {
  test('renders 20 cards, filters narrow, detail modal opens', async ({ signedInPage }) => {
    await signedInPage.goto('/app/scenarios');
    await expect(signedInPage.getByRole('heading', { name: /^Scenarios$/ })).toBeVisible();

    // Each card is a button labelled with its scenario title.
    const cards = signedInPage.locator('button[aria-label][data-scroll-target=""]');
    await expect(cards).toHaveCount(20, { timeout: 5_000 });

    // Stage chip narrows to 4 (4 scenarios per stage in the seeds).
    await signedInPage.getByRole('radio', { name: /Individual/i }).click();
    await expect(cards).toHaveCount(4);

    // Stack a "≤10 min" duration filter on top of Individual → none match.
    await signedInPage.getByRole('radio', { name: /≤ ?10 min/i }).click();
    await expect(signedInPage.getByText(/No scenarios match/i)).toBeVisible();

    // Clear filters restores the full grid.
    await signedInPage.getByRole('button', { name: /Clear filters/i }).click();
    await expect(cards).toHaveCount(20);

    // Detail modal opens with the full body.
    await signedInPage.getByRole('button', { name: /Tower of any height/i }).click();
    await expect(signedInPage.getByRole('dialog')).toBeVisible();
    await expect(signedInPage.getByRole('button', { name: /Copy text/i })).toBeVisible();
  });
});

test.describe('Per-stage picker + pre-session checklist', () => {
  test('facilitator: pick scenario per stage, write brief, tick a11y → Ready to start', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);

    // Checklist is visible above the stages list while session is draft.
    await expect(signedInPage.getByText(/Before you start/i)).toBeVisible();

    // 1. Brief: fill ≥ 40 chars and blur to trigger the save.
    const brief = signedInPage.getByPlaceholder(/What this workshop is about/i);
    await brief.fill('This is a long-enough workshop brief to clear the auto-tick threshold.');
    await brief.blur();
    await expect(signedInPage.locator('[data-testid="checklist-item-brief"]')).toHaveAttribute(
      'data-status',
      'done',
      { timeout: 5_000 },
    );

    // 2. Scenarios: pick one per stage. seededSession exposes all five.
    for (const stageId of Object.values(seededSession.stageIds)) {
      await signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`).click();
      await signedInPage
        .getByTestId('scenario-picker-confirm')
        .first()
        .click();
      await expect(
        signedInPage.locator(`[data-testid="scenario-change-${stageId}"]`),
      ).toBeVisible({ timeout: 5_000 });
    }

    await expect(signedInPage.locator('[data-testid="checklist-item-scenarios"]')).toHaveAttribute(
      'data-status',
      'done',
      { timeout: 5_000 },
    );

    // 3. A11y manual toggle.
    await signedInPage.getByRole('checkbox', { name: /Review accessibility/i }).check();
    await expect(signedInPage.locator('[data-testid="checklist-item-a11y"]')).toHaveAttribute(
      'data-status',
      'done',
      { timeout: 5_000 },
    );

    // 4. Ready-to-start pill.
    await expect(signedInPage.getByText(/Ready to start/i)).toBeVisible();
  });
});
