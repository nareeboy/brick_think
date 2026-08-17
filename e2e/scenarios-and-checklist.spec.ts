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

    // 2. Scenarios: expand the checklist row (each ChecklistRow renders its
    // body only when expanded), then pick one per stage. The pick button's
    // testid stays the same on both states; the label flips from "Pick a
    // scenario" to "Change" once a pick lands.
    await signedInPage.getByRole('button', { name: /Pick a scenario for each stage/i }).click();
    for (const stageId of Object.values(seededSession.stageIds)) {
      const button = signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`);
      await button.click();
      await signedInPage.getByTestId('scenario-picker-confirm').first().click();
      await expect(button).toHaveText(/Change/, { timeout: 5_000 });
    }

    await expect(signedInPage.locator('[data-testid="checklist-item-scenarios"]')).toHaveAttribute(
      'data-status',
      'done',
      { timeout: 5_000 },
    );

    // 3. A11y manual toggle — now a role="switch" button ("Accessibility for
    //    the pieces"); it ticks its own row but deliberately does NOT gate
    //    "Ready to start" (pattern overlays are an optional aid).
    await signedInPage.getByRole('switch', { name: /Accessibility for the pieces/i }).click();
    await expect(signedInPage.locator('[data-testid="checklist-item-a11y"]')).toHaveAttribute(
      'data-status',
      'done',
      { timeout: 5_000 },
    );

    // 4. Ready-to-start pill (brief + scenarios are the gating items).
    await expect(signedInPage.getByText(/Ready to start/i)).toBeVisible();
  });

  test('facilitator picks a scenario from another stage type', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);

    // Open the picker for the first stage (skill_building at position 0).
    await signedInPage.getByRole('button', { name: /Pick a scenario for each stage/i }).click();
    const stageId = Object.values(seededSession.stageIds)[0]!;
    await signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`).click();

    // The stage filter defaults to the stage's own type; widen it to another
    // stage and pick one of its scenarios — cross-stage picks are allowed.
    const dialog = signedInPage.getByRole('dialog');
    await expect(dialog.getByTestId('scenario-picker-confirm').first()).toBeVisible();
    await dialog.getByRole('radio', { name: 'Individual' }).click();
    await dialog.getByTestId('scenario-picker-confirm').first().click();
    await expect(signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`)).toHaveText(
      /Change/,
      { timeout: 5_000 },
    );
  });

  test('facilitator creates a custom scenario from inside the picker and picks it', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);

    // Open the picker for the first stage (skill_building at position 0).
    await signedInPage.getByRole('button', { name: /Pick a scenario for each stage/i }).click();
    const stageId = Object.values(seededSession.stageIds)[0]!;
    await signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`).click();

    // Library templates render with no "Your scenarios" section yet.
    await expect(signedInPage.getByTestId('scenario-picker-confirm').first()).toBeVisible();
    await expect(signedInPage.getByText('Your scenarios')).toHaveCount(0);

    // Create a custom scenario without leaving the modal. The editor opens
    // with the picker's stage preselected.
    await signedInPage.getByTestId('picker-new-scenario').click();
    await signedInPage.getByLabel('Title').fill('Picker-born scenario');
    await signedInPage.getByLabel('Prompt').fill('Build the thing this picker created.');
    await signedInPage.getByTestId('scenario-editor-save').click();

    // The editor closes and the refreshed picker lists the new scenario in
    // its custom section, above the library.
    const dialog = signedInPage.getByRole('dialog');
    await expect(dialog.getByText('Your scenarios')).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText('Picker-born scenario')).toBeVisible();

    // Search narrows to the new scenario, then pick it.
    await dialog.getByRole('searchbox', { name: /Search scenarios/i }).fill('Picker-born');
    await expect(dialog.getByTestId('scenario-picker-confirm')).toHaveCount(1);
    await dialog.getByTestId('scenario-picker-confirm').click();
    await expect(signedInPage.locator(`[data-testid="scenario-pick-${stageId}"]`)).toHaveText(
      /Change/,
      { timeout: 5_000 },
    );
  });
});
