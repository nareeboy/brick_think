import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('onboarding walkthrough', () => {
  test('facilitator sees welcome modal then checklist', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');

    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('onboarding-welcome-cta').click();
    await expect(modal).toHaveCount(0);

    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
    await expect(signedInPage.getByTestId('onboarding-step-org')).toHaveAttribute(
      'data-done',
      '0',
    );

    // Welcome modal does not re-fire on reload.
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);
    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
  });

  test('checklist auto-collapses once all steps are done', async ({ signedInPage, seededSession }) => {
    // seededSession creates org + session for the user but no models yet.
    // To tick step 3, navigate into the session and start a model.
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);
    // Dismiss the spotlight tour first so it doesn't intercept clicks.
    await signedInPage.getByTestId('onboarding-spotlight-skip').click();
    // Click the first "Start your model" button.
    await signedInPage
      .locator('[data-testid^="start-model-"]')
      .first()
      .click();
    // Wait for the design page to open, then go back to my-designs.
    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
    await signedInPage.goto('/app/my-designs');

    await expect(signedInPage.getByTestId('onboarding-checklist-complete')).toBeVisible();

    // After a reload, the complete card has auto-dismissed.
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-checklist-complete')).toHaveCount(0);
    await expect(signedInPage.getByTestId('onboarding-checklist')).toHaveCount(0);
  });

  test('spotlight tour fires on first session page visit', async ({ signedInPage, seededSession }) => {
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);
    const spotlight = signedInPage.getByTestId('onboarding-spotlight');
    await expect(spotlight).toBeVisible();
    await expect(spotlight).toContainText('This is a session');
    await spotlight.getByTestId('onboarding-spotlight-next').click();
    await expect(spotlight).toContainText('Stages');
    await spotlight.getByTestId('onboarding-spotlight-skip').click();
    await expect(spotlight).toHaveCount(0);

    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-spotlight')).toHaveCount(0);
  });

  test('replay walkthrough re-fires the modal', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-cta').click();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);

    await signedInPage.goto('/app/account');
    await signedInPage.getByTestId('replay-walkthrough-button').click();
    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toBeVisible();
  });

  test('participant coach-mark fires when role is participant', async ({
    signedInPage,
    seededSession,
  }) => {
    // Manually flip the role to participant — the invite system that normally
    // does this isn't built yet.
    await signedInPage.addInitScript(() => {
      window.localStorage.setItem('bt_onboarding_role', 'participant');
    });
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);

    const coachMark = signedInPage.getByTestId('onboarding-coachmark');
    await expect(coachMark).toBeVisible();
    await expect(coachMark).toContainText('Click your stage card');

    // Spotlight tour should NOT fire for participant.
    await expect(signedInPage.getByTestId('onboarding-spotlight')).toHaveCount(0);

    // Any click dismisses the coach-mark.
    await signedInPage.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(coachMark).toHaveCount(0);

    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-coachmark')).toHaveCount(0);
  });
});
