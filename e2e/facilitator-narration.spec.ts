import type { BrowserContext, Page } from '@playwright/test';

import { test, expect } from './fixtures';

// Deterministic fake SpeechRecognition — emits one FINAL result ~30ms after
// start(), and fires onend on stop()/abort(). Mirrors model-narration.spec.ts.
const FAKE_SPEECH = `
(() => {
  class FakeRecognition {
    continuous = false; interimResults = false; lang = '';
    onresult = null; onerror = null; onend = null;
    start() {
      setTimeout(() => {
        if (this.onresult) {
          const result = Object.assign([{ transcript: 'this is my model story' }], { isFinal: true });
          this.onresult({ resultIndex: 0, results: Object.assign([result], { length: 1 }) });
        }
      }, 30);
    }
    stop() { if (this.onend) this.onend(); }
    abort() { if (this.onend) this.onend(); }
  }
  window.SpeechRecognition = FakeRecognition;
  window.webkitSpeechRecognition = FakeRecognition;
})();
`;

// Spin up a second signed-in browser context (participant). Mirrors
// model-narration.spec.ts / participant-join.spec.ts helper.
async function newSignedInContext(
  ownerPage: Page,
  label: string,
): Promise<{ context: BrowserContext; page: Page; userId: string }> {
  const browser = ownerPage.context().browser();
  if (!browser) throw new Error('browser missing');
  const context = await browser.newContext();
  const page = await context.newPage();
  // Suppress first-login walkthroughs.
  await page.addInitScript(() => {
    window.localStorage.setItem('bt_welcome_seen', '1');
    window.localStorage.setItem('bt_checklist_dismissed', '1');
    window.localStorage.setItem('bt_session_tour_seen', '1');
  });
  // Inject fake speech on the participant so their recording is deterministic.
  await page.addInitScript(FAKE_SPEECH);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${label}-${suffix}@brick-think.test`;
  const res = await page.request.post('/api/test/sign-in', { data: { email } });
  if (!res.ok()) {
    throw new Error(`participant sign-in failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { userId?: string | null };
  const userId = body.userId ?? '';
  if (!userId) throw new Error('participant sign-in returned no userId');
  return { context, page, userId };
}

test.describe('facilitator-driven narration', () => {
  test('facilitator starts/stops narration → participant records → transcript saved and visible', async ({
    signedInPage: facilitatorPage,
    seededSession,
  }) => {
    // Step 1: Inject fake speech on the facilitator page (optional but
    // consistent) and navigate to the session.
    await facilitatorPage.addInitScript(FAKE_SPEECH);

    // Step 2: Facilitator opens the session page.
    await facilitatorPage.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(facilitatorPage.getByTestId('session-title')).toBeVisible();

    // Step 3: Spin up the participant context and join via join code.
    const participant = await newSignedInContext(facilitatorPage, 'narration-participant');
    try {
      await participant.page.goto(`/app/join/${seededSession.joinCode}`);
      await participant.page.waitForURL(`**/app/sessions/${seededSession.sessionId}`, {
        timeout: 15_000,
      });

      // Step 4: Participant clicks "start-model-individual_model" to create
      // their own canvas, then waits for navigation to /app/designs/<id>.
      await participant.page
        .getByTestId('stage-card-individual_model')
        .getByTestId('start-model-individual_model')
        .click();
      await participant.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/, { timeout: 20_000 });
      const participantDesignUrl = participant.page.url();
      const participantModelId = participantDesignUrl.match(/\/app\/designs\/([0-9a-f-]+)/)?.[1];
      if (!participantModelId) throw new Error('could not extract participantModelId from URL');

      await expect(participant.page.getByTestId('builder-canvas')).toBeVisible({
        timeout: 15_000,
      });
      // Participant stays on the canvas tab for the remainder of the test.

      // Step 5: Facilitator refreshes the participants list and waits for
      // the per-participant narration Start button to appear.
      await facilitatorPage.getByTestId('refresh-participants-individual_model').click();
      await expect(
        facilitatorPage.getByTestId(`narration-start-${participantModelId}`),
      ).toBeVisible({ timeout: 15_000 });
      await facilitatorPage.getByTestId(`narration-start-${participantModelId}`).click();

      // Step 6: Participant tab — the prompt panel becomes visible; tap to
      // record. The fake SpeechRecognition fires a final result ~30ms after
      // start(). The first-time consent flow is handled by a single click
      // ("Allow mic & record") that both acknowledges and starts recording.
      await expect(participant.page.getByTestId('narration-participant-prompt')).toBeVisible({
        timeout: 15_000,
      });
      await participant.page.getByTestId('narration-participant-record').click();

      // Live transcript should contain the fake speech text.
      await expect(participant.page.getByTestId('live-transcript-chat')).toContainText(
        'model story',
        { timeout: 10_000 },
      );

      // Step 7: Facilitator sees "Recording" status chip, then stops narration.
      await expect(
        facilitatorPage.getByTestId(`narration-status-${participantModelId}`),
      ).toContainText('Recording', { timeout: 15_000 });
      await facilitatorPage.getByTestId(`narration-stop-${participantModelId}`).click();

      // Step 8: After stop the facilitator waits for the Transcript button to
      // appear (realtime broadcast → page update). Up to 15s.
      await expect(
        facilitatorPage.getByTestId(`participant-transcript-${participantModelId}`),
      ).toBeVisible({ timeout: 15_000 });
      await facilitatorPage.getByTestId(`participant-transcript-${participantModelId}`).click();

      // The transcript modal should surface the recorded text.
      // We look for the text anywhere on the facilitator page after the click.
      await expect(facilitatorPage.getByText('model story')).toBeVisible({ timeout: 10_000 });
    } finally {
      // Step 9: Clean up the participant's auth user.
      const cleanupRes = await facilitatorPage.request.post('/api/test/delete-user', {
        data: { userId: participant.userId },
      });
      if (!cleanupRes.ok()) {
        console.warn(
          `[e2e] participant cleanup failed (${participant.userId}): ${cleanupRes.status()} ${await cleanupRes.text()}`,
        );
      }
      await participant.context.close();
    }
  });
});
