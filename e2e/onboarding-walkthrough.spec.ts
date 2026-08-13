import { expect } from '@playwright/test';

import { test } from './fixtures';

test.describe('onboarding walkthrough', () => {
  test.beforeEach(async ({ signedInPage }) => {
    // The signedInPage fixture suppresses the walkthrough on EVERY document
    // load (its init script re-runs per navigation). Onboarding specs need
    // the opposite: a fresh user whose flags evolve only through real user
    // interactions during the test.
    //
    // Snapshot-restore: this script runs after the fixture's suppression
    // script (registration order). On every pagehide it snapshots the
    // walkthrough flags into sessionStorage; at the next document-start it
    // restores that snapshot over whatever the fixture injected. The first
    // navigation (no snapshot yet) clears everything — true fresh-user state.
    //
    // The previous heuristic ("clear all flags once, then only
    // bt_checklist_dismissed") failed for any test whose tour-bearing page
    // was NOT the first navigation: the fixture re-injected
    // bt_session_tour_seen=1 on the second load and the spotlight tour (and
    // its skip button) could never appear.
    await signedInPage.addInitScript(() => {
      const KEYS = [
        'bt_welcome_seen',
        'bt_checklist_dismissed',
        'bt_checklist_complete',
        'bt_session_tour_seen',
      ];
      const SNAP = '__bt_e2e_ob_snapshot';
      const raw = window.sessionStorage.getItem(SNAP);
      if (raw === null) {
        // First navigation in this tab: fresh-user state.
        for (const k of KEYS) window.localStorage.removeItem(k);
      } else {
        const snap = JSON.parse(raw) as Record<string, string | null>;
        for (const k of KEYS) {
          const v = snap[k];
          if (v === null || v === undefined) window.localStorage.removeItem(k);
          else window.localStorage.setItem(k, v);
        }
      }
      window.addEventListener('pagehide', () => {
        const snap: Record<string, string | null> = {};
        for (const k of KEYS) snap[k] = window.localStorage.getItem(k);
        window.sessionStorage.setItem(SNAP, JSON.stringify(snap));
      });
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
    await signedInPage.goto(`/app/workshops/${seededSession.orgId}`);
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

  test('create-session spotlight fires from the checklist deep-link', async ({
    signedInPage,
    seededSession,
  }) => {
    // The checklist's step 2 link carries ?onboarding=create-session; landing
    // on the org page with that param fires the spotlight on the button.
    await signedInPage.goto(`/app/workshops/${seededSession.orgId}?onboarding=create-session`);

    const spotlight = signedInPage.getByTestId('create-session-spotlight');
    await expect(spotlight).toBeVisible();
    await expect(spotlight).toContainText('Create your first session');

    // The highlighted button stays clickable through the overlay and opens the
    // new-session dialog; the spotlight gets out of the way.
    await signedInPage.getByTestId('open-new-session-dialog').click();
    await expect(spotlight).toHaveCount(0);

    // Reloading without the param does not re-fire it.
    await signedInPage.goto(`/app/workshops/${seededSession.orgId}`);
    await expect(signedInPage.getByTestId('create-session-spotlight')).toHaveCount(0);
  });

  test('start-model spotlight sequences Start then Start your model', async ({
    signedInPage,
    seededSession,
  }) => {
    // Checklist step 3 carries ?onboarding=start-model; landing on the session
    // with it runs the two-step spotlight and suppresses the auto-tour.
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}?onboarding=start-model`);

    const spotlight = signedInPage.getByTestId('start-model-spotlight');
    await expect(spotlight).toBeVisible();
    await expect(spotlight).toContainText('Open the stage');
    // Auto-tour is suppressed while this spotlight is active.
    await expect(signedInPage.getByTestId('onboarding-spotlight')).toHaveCount(0);

    await spotlight.getByTestId('start-model-spotlight-next').click();
    await expect(spotlight).toContainText('Start your model');

    // The highlighted button is clickable through the overlay and opens the
    // builder (first stage is skill_building).
    await signedInPage.getByTestId('start-model-skill_building').click();
    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
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
