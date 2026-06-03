// e2e/session-pdf-report.spec.ts
//
// Covers the page-level wiring of the session PDF-report feature: when the
// Generate report button is visible, when it's hidden, and that the no-key
// error path surfaces the deep link to the org's Integrations settings.
//
// Option A (UI-only) per Task 19 — the full Anthropic + PDF flow is exercised
// by the integration test (lib/reports + report-actions). Playwright's
// page.route() only intercepts browser requests; the Anthropic call lives
// behind the server action and can't be stubbed at the browser layer. This
// spec verifies the surface the user sees: facilitator gating, session-status
// gating, and the no-key error message + deep link.

import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';

interface ParticipantSetup {
  context: BrowserContext;
  page: Page;
  email: string;
  userId: string;
}

async function setUpParticipant(
  facilitatorPage: Page,
  sessionId: string,
  facilitatorEmail: string,
): Promise<ParticipantSetup> {
  const res = await facilitatorPage.request.post('/api/test/seed-session-member', {
    data: { sessionId, callerEmail: facilitatorEmail },
  });
  if (!res.ok()) {
    throw new Error(`seed-session-member failed (${res.status()}): ${await res.text()}`);
  }
  const { email, userId } = (await res.json()) as { email: string; userId: string };

  const browser = facilitatorPage.context().browser();
  if (!browser) throw new Error('browser missing');
  const context = await browser.newContext();
  const page = await context.newPage();

  // Suppress walkthrough flags — mirrors the signedInPage fixture.
  await page.addInitScript(() => {
    window.localStorage.setItem('bt_welcome_seen', '1');
    window.localStorage.setItem('bt_checklist_dismissed', '1');
    window.localStorage.setItem('bt_session_tour_seen', '1');
  });

  const signInRes = await page.request.post('/api/test/sign-in', { data: { email } });
  if (!signInRes.ok()) {
    throw new Error(
      `participant sign-in failed (${signInRes.status()}): ${await signInRes.text()}`,
    );
  }

  return { context, page, email, userId };
}

async function cleanupParticipant(
  facilitatorPage: Page,
  participant: ParticipantSetup,
): Promise<void> {
  const res = await facilitatorPage.request.post('/api/test/delete-user', {
    data: { userId: participant.userId },
  });
  if (!res.ok()) {
    console.warn(
      `[e2e] participant cleanup failed for ${participant.email} (${participant.userId}): ${res.status()} ${await res.text()}`,
    );
  }
  await participant.context.close();
}

async function completeSession(page: Page, sessionId: string, callerEmail: string): Promise<void> {
  const res = await page.request.post('/api/test/complete-session', {
    data: { sessionId, callerEmail },
  });
  if (!res.ok()) {
    throw new Error(`complete-session failed (${res.status()}): ${await res.text()}`);
  }
}

test.describe('Session PDF report button', () => {
  test('Generate report button is hidden on a non-completed session', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Brand-new sessions start in 'scheduled' status — the button gate is on
    // session.status === 'completed' so it must not render here.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(page.getByTestId('session-title')).toBeVisible();
    await expect(page.getByRole('button', { name: /generate report/i })).toHaveCount(0);
  });

  test('facilitator sees Generate report on a completed session and the no-key path surfaces the deep link', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    // Need at least one model in the session, otherwise the action short-circuits
    // on `no_models` instead of reaching the Anthropic key lookup. Drop one in
    // via the individual_model stage.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);

    // Flip session → completed via the dev-only test route. Going through the
    // full state machine (start → advance × 5) would be slow and tangential.
    await completeSession(page, seededSession.sessionId, signedInEmail);

    // Reload the session page; the facilitator should now see the button.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    const generateButton = page.getByRole('button', { name: /generate report/i });
    await expect(generateButton).toBeVisible();

    // Org has no Anthropic key configured yet, so clicking should surface the
    // friendly error + a deep link to the Integrations page.
    await generateButton.click();
    await expect(page.getByText(/no Anthropic key/i)).toBeVisible();
    const deepLink = page.getByRole('link', { name: /add one/i });
    await expect(deepLink).toBeVisible();
    await expect(deepLink).toHaveAttribute(
      'href',
      `/app/orgs/${seededSession.orgId}/settings/integrations`,
    );
  });

  test('non-facilitator member does not see the Generate report button', async ({
    signedInPage: facilitatorPage,
    signedInEmail: facilitatorEmail,
    seededSession,
  }) => {
    // Flip the session to completed so the facilitator-side gate is the only
    // remaining variable.
    await completeSession(facilitatorPage, seededSession.sessionId, facilitatorEmail);

    // Sanity-check: the facilitator sees the button on the completed session.
    await facilitatorPage.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(facilitatorPage.getByRole('button', { name: /generate report/i })).toBeVisible();

    // Add a second member to the org (not facilitator) and load the session
    // in their tab — the button must be absent.
    const participant = await setUpParticipant(
      facilitatorPage,
      seededSession.sessionId,
      facilitatorEmail,
    );
    try {
      await participant.page.goto(`/app/sessions/${seededSession.sessionId}`);
      await expect(participant.page.getByTestId('session-title')).toBeVisible();
      await expect(participant.page.getByRole('button', { name: /generate report/i })).toHaveCount(
        0,
      );
    } finally {
      await cleanupParticipant(facilitatorPage, participant);
    }
  });
});
