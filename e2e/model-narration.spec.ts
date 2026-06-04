import type { BrowserContext, Page } from '@playwright/test';

import { test, expect } from './fixtures';

// The Web Speech API (SpeechRecognition) is not available — and not reliable —
// in Playwright's headless Chromium. We inject a deterministic fake BEFORE the
// page loads so the narration recorder behaves predictably:
//   - start() fires onresult once with a single FINAL result, then we leave it
//     to the user-driven stop() to emit onend.
//   - stop()/abort() fire onend, which the hook reads to flip status→'stopped'.
// The result shape mirrors what components/builder/useSpeechNarration.ts reads:
// it iterates `e.results` from `e.resultIndex`, treating each result as
// array-like with `[0].transcript` and an `isFinal` boolean.
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

// Spin up a second signed-in browser context for the read-only viewer. Mirrors
// the helper in participant-join.spec.ts: fresh context, walkthrough flags
// suppressed, signed in via the dev-only /api/test/sign-in route. The returned
// userId is used for fixture teardown.
async function newSignedInContext(
  ownerPage: Page,
  label: string,
): Promise<{ context: BrowserContext; page: Page; userId: string }> {
  const browser = ownerPage.context().browser();
  if (!browser) throw new Error('browser missing');
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.localStorage.setItem('bt_welcome_seen', '1');
    window.localStorage.setItem('bt_checklist_dismissed', '1');
    window.localStorage.setItem('bt_session_tour_seen', '1');
  });
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${label}-${suffix}@brick-think.test`;
  const res = await page.request.post('/api/test/sign-in', { data: { email } });
  if (!res.ok()) {
    throw new Error(`viewer sign-in failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { userId?: string | null };
  const userId = body.userId ?? '';
  if (!userId) throw new Error('viewer sign-in returned no userId');
  return { context, page, userId };
}

test.describe('model narration', () => {
  test('owner records → saves → persists; read-only viewer sees transcript only', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Inject the fake SpeechRecognition on the owner's context before any
    // navigation so the recorder branch (not the textarea fallback) renders.
    await page.addInitScript(FAKE_SPEECH);

    // Reuse the established session-scoped owned-model setup: open the session,
    // start the individual_model stage (a non-room canvas the signed-in user
    // owns) and land on /app/designs/[id]. This is the only state where the
    // owner gets canRecord — sessionContext is required.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(page.getByTestId('session-title')).toBeVisible();
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const designUrl = page.url();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    // Open the narration drawer.
    await page.getByTestId('narration-button').click();

    // First-time owner sees the privacy notice — acknowledge it. (The
    // signedInPage fixture pre-sets other walkthrough flags but NOT
    // bt_narration_notice_seen, so this notice always appears first.)
    const ack = page.getByTestId('narration-notice-ack');
    await expect(ack).toBeVisible();
    await ack.click();

    // Record → the fake fires a final result ~30ms after start(); stop() then
    // emits onend so the recorder flips to 'stopped' and the Save button shows.
    await page.getByTestId('narration-record').click();
    await page.getByTestId('narration-stop').click();
    await page.getByTestId('narration-save').click();

    // After save the stored transcript renders. No Anthropic key on the test
    // user → cleanup is skipped → transcript === the raw captured text.
    await expect(page.getByTestId('narration-transcript')).toContainText('model story');

    // Persistence: reload, re-open the drawer, transcript survives.
    await page.reload();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await page.getByTestId('narration-button').click();
    await expect(page.getByTestId('narration-transcript')).toContainText('model story');

    // ── Step 8: read-only viewer ──────────────────────────────────────────
    // A second signed-in user joins the session via its join code (becoming a
    // session_participant, which satisfies can_read_model's participant
    // branch). They open the owner's design and should see the saved
    // transcript but NOT the record control (canRecord is owner-only).
    const viewer = await newSignedInContext(page, 'narration-viewer');
    try {
      await viewer.page.goto(`/app/join/${seededSession.joinCode}`);
      await viewer.page.waitForURL(`**/app/sessions/${seededSession.sessionId}`, {
        timeout: 10_000,
      });

      await viewer.page.goto(designUrl);
      await expect(viewer.page.getByTestId('builder-canvas')).toBeVisible();

      // The Narrate button still renders for a reader when a narration exists
      // (initialNarration !== null), so open the drawer.
      await viewer.page.getByTestId('narration-button').click();
      await expect(viewer.page.getByTestId('narration-transcript')).toContainText('model story');
      // Reader is not the owner → no recorder, no notice ack.
      await expect(viewer.page.getByTestId('narration-record')).toHaveCount(0);
    } finally {
      // Clean up the viewer's auth user (mirrors participant-join.spec.ts).
      const cleanupRes = await page.request.post('/api/test/delete-user', {
        data: { userId: viewer.userId },
      });
      if (!cleanupRes.ok()) {
        console.warn(
          `[e2e] viewer cleanup failed (${viewer.userId}): ${cleanupRes.status()} ${await cleanupRes.text()}`,
        );
      }
      await viewer.context.close();
    }
  });
});
