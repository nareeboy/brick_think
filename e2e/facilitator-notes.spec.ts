// e2e/facilitator-notes.spec.ts
//
// Locks in the facilitator-private notes surface end-to-end:
//   - "Private notes" card on the session-detail page (facilitator-only).
//   - Right-edge drawer on a session-scoped design page (facilitator-only).
//   - Cross-page persistence — both surfaces hit the same `sessions.facilitator_notes`
//     column via getFacilitatorNotes / updateFacilitatorNotesAction.
//   - Non-facilitator org-members can't see the card on the session page.
//
// Privacy at the data-layer (no facilitator_notes column visibility for
// non-owners) is covered by the Vitest integration suite — this spec only
// asserts the rendered-UI consequence (card absence).

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

  // Mirror signedInPage fixture — suppress the first-login walkthrough so the
  // welcome modal / spotlight tour don't overlay our assertions.
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

test.describe('facilitator notes — card + drawer + cross-page persistence', () => {
  test('facilitator can edit notes on session page, on design drawer, and sees changes round-trip', async ({
    signedInPage: facilitatorPage,
    signedInEmail: facilitatorEmail,
    seededSession,
  }) => {
    const sessionUrl = `/app/sessions/${seededSession.sessionId}`;

    // ---- 1. Session-page card: type, autosave, "Saved" indicator. ----
    await facilitatorPage.goto(sessionUrl);
    await expect(facilitatorPage.getByTestId('session-title')).toBeVisible();
    const cardHeading = facilitatorPage.getByRole('heading', { name: 'Private notes' });
    await expect(cardHeading).toBeVisible();

    const cardTextarea = facilitatorPage.getByLabel('Facilitator notes');
    await expect(cardTextarea).toBeVisible();
    await cardTextarea.fill('remember to ask about brick #3');

    // NotesEditor debounces autosave at 1000ms then flips status to "Saved …".
    await expect(facilitatorPage.getByText(/^Saved /)).toBeVisible({ timeout: 5_000 });

    // ---- 2. Reload persistence — same value comes back. ----
    await facilitatorPage.reload();
    await expect(facilitatorPage.getByLabel('Facilitator notes')).toHaveValue(
      'remember to ask about brick #3',
    );

    // ---- 3. Open a session-scoped design (individual_model) so the
    //         FacilitatorNotesButton mounts in the canvas chrome. ----
    await facilitatorPage
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await facilitatorPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(facilitatorPage.getByTestId('builder-canvas')).toBeVisible();
    const designUrl = facilitatorPage.url();

    // ---- 4. Drawer interaction: open, see prior value, edit, autosave,
    //         close with Escape. ----
    const notesTrigger = facilitatorPage.getByTestId('facilitator-notes-button');
    await expect(notesTrigger).toBeVisible();
    await notesTrigger.click();

    const drawer = facilitatorPage.getByRole('dialog', { name: 'Facilitator notes' });
    await expect(drawer).toBeVisible();
    const drawerTextarea = drawer.getByLabel('Facilitator notes');
    await expect(drawerTextarea).toHaveValue('remember to ask about brick #3');

    await drawerTextarea.fill('updated from drawer');
    await expect(drawer.getByText(/^Saved /)).toBeVisible({ timeout: 5_000 });

    await facilitatorPage.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    // ---- 5. Cross-page sync: navigate back to the session page, the card
    //         carries the value just saved from the drawer. ----
    await facilitatorPage.goto(sessionUrl);
    await expect(facilitatorPage.getByRole('heading', { name: 'Private notes' })).toBeVisible();
    await expect(facilitatorPage.getByLabel('Facilitator notes')).toHaveValue(
      'updated from drawer',
    );

    // ---- 6. Non-facilitator org-member can access the session page but
    //         does NOT see the "Private notes" card. ----
    const participant = await setUpParticipant(
      facilitatorPage,
      seededSession.sessionId,
      facilitatorEmail,
    );
    try {
      await participant.page.goto(sessionUrl);
      // Session title is visible to org members…
      await expect(participant.page.getByTestId('session-title')).toBeVisible();
      // …but the private-notes heading is facilitator-only.
      await expect(participant.page.getByRole('heading', { name: 'Private notes' })).toHaveCount(0);

      // And the drawer trigger never mounts on the participant's view of the
      // facilitator-owned canvas either (they're read-only, not the
      // facilitator). They can navigate to the URL because they're an org
      // member; the chrome just hides the trigger.
      await participant.page.goto(designUrl);
      await expect(participant.page.getByTestId('builder-canvas')).toBeVisible();
      await expect(participant.page.getByTestId('facilitator-notes-button')).toHaveCount(0);
    } finally {
      await cleanupParticipant(facilitatorPage, participant);
    }
  });
});
