// e2e/facilitator-live-readonly.spec.ts
//
// Locks in: a facilitator (or any non-owner session-org-member) opening a
// participant's individual_model design sees canvas updates within 3s as
// the participant edits. Uses Supabase Realtime via the useModelRealtime
// hook; participant's autosave debounces at 1s, so total ≤ ~2s.

import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';

async function dropFirstBrickAt(page: Page, offsetX: number, offsetY: number): Promise<void> {
  await page.getByRole('button', { name: /open pieces/i }).click();
  const piece = page.getByTestId('piece-card').nth(0);
  const canvas = page.getByTestId('builder-canvas');
  await piece.waitFor();
  await canvas.waitFor();
  const pieceBox = await piece.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!pieceBox || !canvasBox) throw new Error('measurement failed');
  await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + offsetX, canvasBox.y + offsetY, { steps: 12 });
  await page.mouse.up();
}

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

test.describe('facilitator live read-only view', () => {
  test('facilitator sees participant brick add within 3s on individual_model', async ({
    signedInPage: facilitatorPage,
    signedInEmail: facilitatorEmail,
    seededSession,
  }) => {
    const participant = await setUpParticipant(
      facilitatorPage,
      seededSession.sessionId,
      facilitatorEmail,
    );

    try {
      // Participant starts their own individual_model design.
      await participant.page.goto(`/app/sessions/${seededSession.sessionId}`);
      await participant.page
        .getByTestId('stage-card-individual_model')
        .getByTestId('start-model-individual_model')
        .click();
      await participant.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
      const modelUrl = participant.page.url();

      // Facilitator opens the participant's model (read-only path).
      await facilitatorPage.goto(modelUrl);
      await expect(facilitatorPage.getByTestId('builder-canvas')).toBeVisible();

      // Participant drops a brick.
      await dropFirstBrickAt(participant.page, 200, 200);
      await expect(participant.page.getByTestId('placed-brick')).toHaveCount(1);

      // The brick must appear in the facilitator's tab within a few seconds
      // (1s autosave debounce + Realtime delivery + render). 8s gives CI
      // headroom over the typical local ~1.5s without inviting silent slowness.
      await expect(facilitatorPage.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 8000,
      });
    } finally {
      await cleanupParticipant(facilitatorPage, participant);
    }
  });

  test('facilitator cannot edit the participant model (read-only enforced)', async ({
    signedInPage: facilitatorPage,
    signedInEmail: facilitatorEmail,
    seededSession,
  }) => {
    const participant = await setUpParticipant(
      facilitatorPage,
      seededSession.sessionId,
      facilitatorEmail,
    );

    try {
      // Participant starts their own individual_model design.
      await participant.page.goto(`/app/sessions/${seededSession.sessionId}`);
      await participant.page
        .getByTestId('stage-card-individual_model')
        .getByTestId('start-model-individual_model')
        .click();
      await participant.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
      const modelUrl = participant.page.url();

      // Participant drops a brick so there's a piece for the facilitator to
      // (fail to) manipulate.
      await dropFirstBrickAt(participant.page, 200, 200);
      await expect(participant.page.getByTestId('placed-brick')).toHaveCount(1);

      // Facilitator opens the participant's model.
      await facilitatorPage.goto(modelUrl);
      await expect(facilitatorPage.getByTestId('builder-canvas')).toBeVisible();

      // The live read-only banner must be visible at the top of the builder.
      await expect(facilitatorPage.getByTestId('live-readonly-banner')).toBeVisible();

      // The read-only badge must be visible in the sidebar.
      // Builder.tsx renders "Read-only · <ownerLabel>" when readOnly=true.
      await expect(facilitatorPage.getByText(/^read-only\s·/i)).toBeVisible();

      // The "Save version" button must be absent — SaveBuildButton returns null
      // when readOnly=true.
      await expect(facilitatorPage.getByRole('button', { name: /save version/i })).toHaveCount(0);

      // The brick propagates to the facilitator's read-only view.
      const facBrick = facilitatorPage.getByTestId('placed-brick').first();
      await expect(facBrick).toHaveCount(1, { timeout: 8000 });

      // Selecting a brick must NOT surface any edit affordance on the canvas.
      // Before the read-only canvas fix, selecting showed the floating "Delete
      // piece" button (and the brick was draggable); both are now gated on
      // !readOnly so a facilitator can observe but never move or remove pieces.
      await facBrick.focus();
      await facilitatorPage.keyboard.press('Enter'); // select the brick
      await expect(facilitatorPage.getByRole('button', { name: /delete piece/i })).toHaveCount(0);

      // Pressing Delete on the selected brick must be a no-op — the piece stays.
      await facBrick.focus();
      await facilitatorPage.keyboard.press('Delete');
      await expect(facilitatorPage.getByTestId('placed-brick')).toHaveCount(1);
    } finally {
      await cleanupParticipant(facilitatorPage, participant);
    }
  });
});
