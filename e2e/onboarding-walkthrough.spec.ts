import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('onboarding walkthrough', () => {
  test.beforeEach(async ({ signedInPage }) => {
    // The signedInPage fixture suppresses the walkthrough by default. This
    // script runs after the fixture's suppression script (registration order)
    // to restore a fresh-user state for onboarding tests.
    //
    // Strategy:
    //   - On the FIRST navigation (sessionStorage key absent): clear all four
    //     flags so the modal, checklist, and tour fire naturally.
    //   - On every subsequent navigation (including reloads): clear only
    //     bt_checklist_dismissed, because the fixture always injects it but
    //     the user never deliberately sets it in these tests. The other flags
    //     (bt_welcome_seen, bt_session_tour_seen) are set by real user
    //     interactions and must survive reloads.
    await signedInPage.addInitScript(() => {
      const firstVisit = !window.sessionStorage.getItem('__bt_e2e_ob_init');
      if (firstVisit) {
        // First navigation: clear all four flags for a true fresh-user state.
        window.sessionStorage.setItem('__bt_e2e_ob_init', '1');
        window.localStorage.removeItem('bt_welcome_seen');
        window.localStorage.removeItem('bt_checklist_dismissed');
        window.localStorage.removeItem('bt_checklist_complete');
        window.localStorage.removeItem('bt_session_tour_seen');
      } else {
        // Subsequent navigations (including reloads): only remove
        // bt_checklist_dismissed, which is injected by the fixture on every
        // load and would suppress the checklist. The other flags are set by
        // real user interactions and must survive reloads:
        //   - bt_welcome_seen: set when user dismisses modal → must stay so
        //     modal does not re-fire on reload.
        //   - bt_checklist_complete: set when checklist reaches all-done →
        //     must stay so the auto-dismiss fires on the next visit.
        //   - bt_session_tour_seen: set when user skips tour → must stay so
        //     tour does not re-fire on reload.
        window.localStorage.removeItem('bt_checklist_dismissed');
      }
    });
  });

  test('facilitator sees welcome modal then checklist', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');

    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('onboarding-welcome-cta').click();
    await expect(modal).toHaveCount(0);

    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
    await expect(signedInPage.getByTestId('onboarding-step-org')).toHaveAttribute('data-done', '0');

    // Welcome modal does not re-fire on reload.
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);
    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
  });

  test('checklist auto-collapses once all steps are done', async ({
    signedInPage,
    seededSession,
  }) => {
    // seededSession creates org + session for the user but no models yet.
    // The walkthrough checklist follows the user onto the org detail page too,
    // where step 2 (create a session) happens.
    await signedInPage.goto(`/app/orgs/${seededSession.orgId}`);
    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
    await expect(signedInPage.getByTestId('onboarding-step-org')).toHaveAttribute('data-done', '1');

    // To tick step 3, navigate into the session and start a model.
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);
    // Dismiss the spotlight tour first so it doesn't intercept clicks.
    await signedInPage.getByTestId('onboarding-spotlight-skip').click();
    // The walkthrough checklist follows the user onto the session page — steps
    // 1 & 2 are done (org + session exist) but step 3 (start a model) is not.
    await expect(signedInPage.getByTestId('onboarding-checklist')).toBeVisible();
    await expect(signedInPage.getByTestId('onboarding-step-org')).toHaveAttribute('data-done', '1');
    await expect(signedInPage.getByTestId('onboarding-step-session')).toHaveAttribute(
      'data-done',
      '1',
    );
    await expect(signedInPage.getByTestId('onboarding-step-model')).toHaveAttribute(
      'data-done',
      '0',
    );
    // Click the first "Start your model" button.
    await signedInPage.locator('[data-testid^="start-model-"]').first().click();
    // Wait for the design page to open, then go back to my-designs.
    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
    await signedInPage.goto('/app/my-designs');

    await expect(signedInPage.getByTestId('onboarding-checklist-complete')).toBeVisible();

    // After a reload, the complete card has auto-dismissed.
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-checklist-complete')).toHaveCount(0);
    await expect(signedInPage.getByTestId('onboarding-checklist')).toHaveCount(0);
  });

  test('spotlight tour fires on first session page visit', async ({
    signedInPage,
    seededSession,
  }) => {
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
