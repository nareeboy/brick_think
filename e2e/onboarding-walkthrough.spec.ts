import { expect, type Page } from '@playwright/test';

import { test } from './fixtures';

/**
 * Re-arm the server-side onboarding state for wizard specs: the sign-in
 * backdoor seeds a COMPLETED configuration by default (the server-side twin
 * of suppressFirstRunOverlays), so wizard tests reset it to a virgin config
 * and strip the fixture's local caches until the flow has been answered
 * (marker in sessionStorage — soft navigations don't re-run init scripts,
 * so the marker only matters across hard loads).
 */
async function makeWizardFresh(page: Page, email: string): Promise<void> {
  const res = await page.request.post('/api/test/sign-in', {
    data: { email, onboarding: 'fresh' },
  });
  expect(res.ok()).toBeTruthy();
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('__bt_wizard_answered') === '1') return;
    for (const k of ['bt_role_choice', 'bt_fluency', 'bt_group_size', 'bt_tutorial_guest']) {
      window.localStorage.removeItem(k);
    }
  });
}

async function markWizardAnswered(page: Page): Promise<void> {
  await page.evaluate(() => window.sessionStorage.setItem('__bt_wizard_answered', '1'));
}

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
    await signedInPage.addInitScript(() => {
      const KEYS = ['bt_welcome_seen', 'bt_session_tour_seen', 'bt_workshop_tour_seen'];
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

  test('configuration flow: a facilitator completes five screens and lands on the hub', async ({
    signedInPage,
    signedInEmail,
  }) => {
    await makeWizardFresh(signedInPage, signedInEmail);
    await signedInPage.goto('/app/my-designs');

    // The hub redirects an unanswered user to the configuration flow.
    await expect(signedInPage).toHaveURL(/\/app\/welcome/);
    await expect(signedInPage.getByTestId('welcome-step-1')).toBeVisible();
    // The flow stands alone — no app chrome, no back arrow on step 1.
    await expect(signedInPage.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
    await expect(signedInPage.getByTestId('welcome-back')).toHaveCount(0);

    // Step 1 — role. Continue is disabled until a chip is selected.
    const cont = signedInPage.getByTestId('welcome-continue');
    await expect(cont).toBeDisabled();
    await signedInPage.getByTestId('welcome-option-facilitator').click();
    await cont.click();

    // Step 2 — fluency (back arrow + step indicator appear).
    await expect(signedInPage.getByTestId('welcome-step-2')).toBeVisible();
    await expect(signedInPage.getByTestId('welcome-step-2')).toContainText('Step 2 of 5');
    await expect(signedInPage.getByTestId('welcome-back')).toBeVisible();
    await signedInPage.getByTestId('welcome-option-new').click();
    await cont.click();

    // Step 3 — purpose ("Not sure yet" is the first option).
    await expect(signedInPage.getByTestId('welcome-step-3')).toBeVisible();
    await signedInPage.getByTestId('welcome-option-team_alignment').click();
    await cont.click();

    // Step 4 — group size; "9 or more" states the recommended ceiling.
    await expect(signedInPage.getByTestId('welcome-step-4')).toBeVisible();
    await signedInPage.getByTestId('welcome-option-9_plus').click();
    await expect(signedInPage.getByTestId('welcome-size-note')).toContainText('8 builders');
    await cont.click();

    // Step 5 — invite is the only skippable step.
    await expect(signedInPage.getByTestId('welcome-step-5')).toBeVisible();
    await signedInPage.getByTestId('welcome-do-later').click();
    await markWizardAnswered(signedInPage);

    // Lands on the hub; the pathway modal takes over from here.
    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toBeVisible();

    // Answered means answered: a reload never re-asks.
    await signedInPage.reload();
    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('welcome-flow')).toHaveCount(0);
  });

  test('configuration flow: a participant sees only step one and never the modal', async ({
    signedInPage,
    signedInEmail,
  }) => {
    await makeWizardFresh(signedInPage, signedInEmail);
    await signedInPage.goto('/app/my-designs');

    await expect(signedInPage).toHaveURL(/\/app\/welcome/);
    await signedInPage.getByTestId('welcome-option-participant').click();
    await signedInPage.getByTestId('welcome-continue').click();
    await markWizardAnswered(signedInPage);

    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);

    // Still answered after a reload — no redirect back, no modal.
    await signedInPage.reload();
    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);
  });

  test('configuration flow: an explorer lands on a fresh personal canvas', async ({
    signedInPage,
    signedInEmail,
  }) => {
    await makeWizardFresh(signedInPage, signedInEmail);
    await signedInPage.goto('/app/my-designs');

    await expect(signedInPage).toHaveURL(/\/app\/welcome/);
    await signedInPage.getByTestId('welcome-option-explorer').click();
    await signedInPage.getByTestId('welcome-continue').click();
    await markWizardAnswered(signedInPage);

    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
  });

  test('configuration answers survive a device with no local state; instruction re-arms', async ({
    signedInPage,
  }) => {
    // The fixture user's server config is already completed (sign-in seed).
    // Simulate a brand-new device (or a devtools localStorage clear) by
    // wiping every bt_ cache on each load: the ANSWERS hydrate back (no
    // wizard, facilitator role intact) while the INSTRUCTION layer is
    // deliberately per-device — the modal and tours re-arm.
    await signedInPage.addInitScript(() => {
      for (const k of Object.keys(window.localStorage)) {
        if (k.startsWith('bt_')) window.localStorage.removeItem(k);
      }
    });
    await signedInPage.goto('/app/my-designs');

    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
    await expect(signedInPage.getByTestId('welcome-flow')).toHaveCount(0);
    // The modal appearing proves both halves: role hydrated to facilitator,
    // and the cleared bt_welcome_seen was NOT refilled from the server.
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toBeVisible();
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

  test('workshop card starts the guided chain; completing the page tour ticks the pathway', async ({
    signedInPage,
  }) => {
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

    // The workshop page tour picks up; walking it through to the end is a
    // genuine completion, so the hub modal shows the workshop tick.
    const tour = signedInPage.getByTestId('workshop-page-tour');
    await expect(tour).toBeVisible();
    const tourNext = tour.getByTestId('workshop-tour-next');
    // Five stops for a full-guidance user; the last button completes.
    for (let i = 0; i < 5; i += 1) {
      await tourNext.click();
    }
    await expect(tour).toHaveCount(0);

    await signedInPage.goto('/app/my-designs');
    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('onboarding-welcome-card-workshop-done')).toBeVisible();
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

  test('skipping a tour records an honest skip — no tick, and the modal still returns', async ({
    signedInPage,
  }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-session').click();
    await expect(signedInPage).toHaveURL(
      /\/app\/workshops\?onboarding=create-workshop&intent=session/,
    );
    await expect(signedInPage.getByTestId('create-workshop-spotlight')).toBeVisible();

    // Skipping stops the prompting for the session pathway but NEVER renders
    // as a tick and never counts toward the finale — it shows the muted
    // Skipped chip instead, and the card stays redoable.
    await signedInPage.getByTestId('create-workshop-spotlight-skip').click();
    await signedInPage.goto('/app/my-designs');
    const modal = signedInPage.getByTestId('onboarding-welcome-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByTestId('onboarding-welcome-card-session-done')).toHaveCount(0);
    await expect(modal.getByTestId('onboarding-welcome-card-session-skipped')).toBeVisible();
    await expect(modal.getByTestId('onboarding-welcome-card-workshop-done')).toHaveCount(0);
  });

  test('build card creates a personal design and opens its canvas', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-build').click();
    await expect(signedInPage).toHaveURL(/\/app\/designs\//);
  });

  test('workshop page tour fires on first visit without the modal or param', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.goto(`/app/workshops/${seededSession.orgId}`);
    const tour = signedInPage.getByTestId('workshop-page-tour');
    await expect(tour).toBeVisible();

    // Esc is a quiet exit but still marks the tour seen for this device.
    await signedInPage.keyboard.press('Escape');
    await expect(tour).toHaveCount(0);
    await signedInPage.reload();
    await expect(signedInPage.getByTestId('workshop-page-tour')).toHaveCount(0);
  });

  test('session card deep-links into the first workshop and fires the create-session spotlight', async ({
    signedInPage,
    seededSession,
  }) => {
    // seededSession gives the user a workshop, so the session card deep-links
    // into it with ?onboarding=create-session, which fires the spotlight on
    // the Create session button (and keeps the first-visit page tour away).
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-card-session').click();
    await expect(signedInPage).toHaveURL(
      new RegExp(`/app/workshops/${seededSession.orgId}\\?onboarding=create-session`),
    );

    const spotlight = signedInPage.getByTestId('create-session-spotlight');
    await expect(spotlight).toBeVisible();
    await expect(spotlight).toContainText('Create your first session');
    await expect(signedInPage.getByTestId('workshop-page-tour')).toHaveCount(0);

    // The highlighted button stays clickable through the overlay and opens the
    // new-session dialog; the spotlight gets out of the way.
    await signedInPage.getByTestId('open-new-session-dialog').click();
    await expect(spotlight).toHaveCount(0);
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

  test('certified fluency shortens the session tour to the non-obvious stops', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.addInitScript(() => {
      window.localStorage.setItem('bt_fluency', 'certified');
    });
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);
    const spotlight = signedInPage.getByTestId('onboarding-spotlight');
    await expect(spotlight).toBeVisible();
    // The explanatory "This is a session" stop is suppressed — the tour
    // opens straight on the stage-card controls.
    await expect(spotlight).toContainText('Stages');
  });

  test('replay walkthrough resets everything and re-runs the configuration flow', async ({
    signedInPage,
  }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('onboarding-welcome-skip').click();
    await signedInPage.getByTestId('onboarding-skip-confirm-close').click();
    await expect(signedInPage.getByTestId('onboarding-welcome-modal')).toHaveCount(0);

    await signedInPage.goto('/app/account');
    await signedInPage.getByTestId('replay-walkthrough-button').click();
    // Replay clears the server state and every local flag, so the
    // configuration flow restarts at step 1.
    await expect(signedInPage).toHaveURL(/\/app\/welcome/);
    await expect(signedInPage.getByTestId('welcome-step-1')).toBeVisible();

    const cont = signedInPage.getByTestId('welcome-continue');
    await signedInPage.getByTestId('welcome-option-facilitator').click();
    await cont.click();
    await signedInPage.getByTestId('welcome-option-new').click();
    await cont.click();
    await signedInPage.getByTestId('welcome-option-not_sure').click();
    await cont.click();
    await signedInPage.getByTestId('welcome-option-solo').click();
    await cont.click();
    await signedInPage.getByTestId('welcome-do-later').click();

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
