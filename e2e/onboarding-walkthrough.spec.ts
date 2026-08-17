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
      const KEYS = ['bt_welcome_seen', 'bt_session_tour_seen'];
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

  test('facilitator sees the three-card welcome modal; skip confirms then persists', async ({
    signedInPage,
  }) => {
    await signedInPage.goto('/app/my-designs');

    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Start building right away');
    await expect(modal).toContainText('Start your first workshop');
    await expect(modal).toContainText('Start a session');

    // Skip asks for confirmation; Go back returns to the modal.
    await modal.getByTestId('onboarding-welcome-skip').click();
    const confirm = signedInPage.getByTestId('onboarding-skip-confirm');
    await expect(confirm).toBeVisible();
    await confirm.getByTestId('onboarding-skip-confirm-back').click();
    await expect(modal).toBeVisible();

    // Confirming closes the tutorial for good.
    await modal.getByTestId('onboarding-welcome-skip').click();
    await confirm.getByTestId('onboarding-skip-confirm-close').click();
    await expect(modal).toHaveCount(0);
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);
  });

  test('workshop card starts the guided create-workshop chain', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-workshop').click();
    await expect(signedInPage).toHaveURL(/\/app\/workshops\?onboarding=create-workshop/);

    // The New workshop button is spotlit; the modal stays out of the way.
    await expect(signedInPage.getByTestId('create-workshop-spotlight')).toBeVisible();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);

    // Clicking the highlighted button continues the tour on the form page.
    await signedInPage.locator('[data-tour-id="new-workshop-button"]').click();
    await expect(signedInPage).toHaveURL(/\/app\/workshops\/new\?onboarding=create-workshop/);
    const formSpotlight = signedInPage.getByTestId('create-workshop-form-spotlight');
    await expect(formSpotlight).toBeVisible();

    // Step 1 gates Next on the name being typed.
    const next = formSpotlight.getByTestId('create-workshop-form-spotlight-next');
    await expect(next).toBeDisabled();
    // Unique name → unique auto-suggested slug (slugs are globally unique).
    await signedInPage
      .locator('[data-tour-id="workshop-name-field"] input')
      .fill(`Tour Workshop ${Date.now().toString(36)}`);
    await expect(next).toBeEnabled();
    await next.click(); // → slug step
    await next.click(); // → create step
    await next.click(); // "Got it" submits the real Create workshop button
    await expect(signedInPage).toHaveURL(/\/app\/workshops\/[0-9a-f-]+\?onboarding=workshop-tour/);

    // The workshop page tour picks up; completing it ticks the pathway.
    await expect(signedInPage.getByTestId('workshop-page-tour')).toBeVisible();
  });

  test('picking a card does not dismiss the modal — it returns on the next hub visit', async ({
    signedInPage,
  }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-workshop').click();
    await expect(signedInPage).toHaveURL(/onboarding=create-workshop/);
    await signedInPage.goto('/app/my-designs');
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toBeVisible();
  });

  test('session card with no workshop detours into workshop creation with session intent', async ({
    signedInPage,
  }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-session').click();
    await expect(signedInPage).toHaveURL(
      /\/app\/workshops\?onboarding=create-workshop&intent=session/,
    );
    await expect(signedInPage.getByTestId('create-workshop-spotlight')).toBeVisible();

    // Skipping on a session-intent detour ticks the SESSION card, not workshop.
    await signedInPage.getByTestId('create-workshop-spotlight-skip').click();
    await signedInPage.goto('/app/my-designs');
    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('onboarding-welcome-card-session-done')).toBeVisible();
    await expect(modal.getByTestId('onboarding-welcome-card-workshop-done')).toHaveCount(0);
  });

  test('build card creates a personal design and opens its canvas', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-build').click();
    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
  });

  test('session card deep-links into the first workshop and fires the create-session spotlight', async ({
    signedInPage,
    seededSession,
  }) => {
    // seededSession gives the user a workshop, so the session card deep-links
    // into it with ?onboarding=create-session, which fires the spotlight on
    // the Create session button.
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-session').click();
    await expect(signedInPage).toHaveURL(
      new RegExp(`/app/workshops/${seededSession.orgId}\\?onboarding=create-session`),
    );

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
    // ?onboarding=start-model on a session runs the two-step spotlight and
    // suppresses the auto-tour (deep-linkable; no longer wired from a card).
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
    await signedInPage.getByTestId('onboarding-welcome-skip').click();
    await signedInPage.getByTestId('onboarding-skip-confirm-close').click();
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
