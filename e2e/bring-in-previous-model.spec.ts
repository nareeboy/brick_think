// e2e/bring-in-previous-model.spec.ts
//
// "Bringing in previous models" on the collaborative stages.
//
// The stage-rooms rework RETIRED the manual "Bring in my previous model"
// affordance on room-backed canvases (app/(authed)/app/designs/[id]/page.tsx
// suppresses it when the model has a room_id): rooms auto-import at creation
// instead. This spec locks in that composition contract end-to-end through
// the facilitator's Manage-rooms UI:
//
//   1. shared_model rooms — setSharedModelRooms seeds each room's canvas with
//      its members' individual_model canvases, laid out as lanes.
//   2. system_model rooms — setDownstreamStageRooms composes each room's
//      canvas from the selected upstream shared_model rooms' canvases.
//
// In both cases the member sees their bricks on the room canvas without any
// manual import, and the legacy bring-in button must NOT render there.

import type { Page } from '@playwright/test';

import {
  cleanupParticipant,
  dropFirstBrickAt,
  expect,
  setUpParticipant,
  startStage,
  test,
  type ParticipantSetup,
} from './fixtures';

/** Member builds an individual_model with one brick; autosave must land
 *  before room creation — the composer reads canvas_state from the row.
 *  The facilitator starts the stage first — a participant's "Start your
 *  model" button is disabled while the stage is pending. */
async function buildIndividualModel(
  facPage: Page,
  member: ParticipantSetup,
  sessionId: string,
): Promise<void> {
  await startStage(facPage, sessionId, 'individual_model');
  await member.page.goto(`/app/sessions/${sessionId}`);
  await member.page
    .getByTestId('stage-card-individual_model')
    .getByTestId('start-model-individual_model')
    .click();
  await member.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  await expect(member.page.getByTestId('builder-canvas')).toBeVisible();
  await dropFirstBrickAt(member.page, 220, 220);
  await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
  await expect(member.page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
    timeout: 15_000,
  });
}

/** Facilitator creates a single shared_model room containing the member via
 *  the Manage rooms dialog (the real product flow — this is what composes the
 *  member's individual_model into the room canvas). */
async function createSharedRoomWithMember(facPage: Page, sessionId: string, memberEmail: string) {
  await facPage.goto(`/app/sessions/${sessionId}`);
  const sharedCard = facPage.getByTestId('stage-card-shared_model');
  await sharedCard.getByTestId('manage-rooms-button').click();
  const dialog = facPage.getByTestId('manage-rooms-dialog');
  await expect(dialog).toBeVisible();
  // Assign the (only unassigned) member to Room 1 via their row's picker.
  const memberRow = dialog.locator('li').filter({ hasText: memberEmail.split('@')[0] });
  await memberRow.getByRole('combobox', { name: 'Move to room' }).selectOption('0');
  await dialog.getByTestId('save-rooms-button').click();
  await expect(dialog).toBeHidden();
  await expect(sharedCard.getByTestId('room-row-0')).toBeVisible();
}

test.describe('room composition brings in previous models', () => {
  test('shared_model room canvas is seeded with the member individual model', async ({
    signedInPage: facPage,
    signedInEmail: facEmail,
    seededSession,
  }) => {
    const member = await setUpParticipant(facPage, seededSession.sessionId, facEmail);
    try {
      // 1. Member builds an individual_model with one brick.
      await buildIndividualModel(facPage, member, seededSession.sessionId);

      // 2. Facilitator partitions the shared_model stage into one room
      //    containing the member.
      await createSharedRoomWithMember(facPage, seededSession.sessionId, member.email);

      // 3. Member opens their room from the session page…
      await member.page.goto(`/app/sessions/${seededSession.sessionId}`);
      await member.page.getByTestId('stage-card-shared_model').getByTestId('open-my-room').click();
      await member.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
      await expect(member.page.getByTestId('builder-canvas')).toBeVisible();

      // 4. …and finds their individual-model brick already composed in as a
      //    lane — no manual import step.
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });

      // 5. The legacy manual affordance is suppressed on room canvases.
      await expect(member.page.getByTestId('bring-in-previous-model')).toHaveCount(0);

      // 6. The composed brick propagates live to a second tab (Yjs doc seeded
      //    from the composed canvas_state).
      const pageB = await member.context.newPage();
      await pageB.goto(member.page.url());
      await expect(pageB.getByTestId('builder-canvas')).toBeVisible();
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });
    } finally {
      await cleanupParticipant(facPage, member);
    }
  });

  test('system_model room composes from the upstream shared_model room', async ({
    signedInPage: facPage,
    signedInEmail: facEmail,
    seededSession,
  }) => {
    const member = await setUpParticipant(facPage, seededSession.sessionId, facEmail);
    try {
      // 1. Member seeds their individual_model with a brick; facilitator
      //    creates the shared_model room (composes that brick in).
      await buildIndividualModel(facPage, member, seededSession.sessionId);
      await createSharedRoomWithMember(facPage, seededSession.sessionId, member.email);

      // 2. Facilitator creates one system_model room sourced from the
      //    upstream shared room (source-toggle-{room}-{srcPosition}).
      const systemCard = facPage.getByTestId('stage-card-system_model');
      await systemCard.getByTestId('manage-rooms-button').click();
      const downstreamDialog = facPage.getByTestId('manage-downstream-rooms-dialog');
      await expect(downstreamDialog).toBeVisible();
      // The source toggle is an aria-pressed button, not a checkbox.
      const sourceToggle = downstreamDialog.getByTestId('source-toggle-0-0');
      await sourceToggle.click();
      await expect(sourceToggle).toHaveAttribute('aria-pressed', 'true');
      await downstreamDialog.getByTestId('save-downstream-rooms-button').click();
      await expect(downstreamDialog).toBeHidden();
      await expect(systemCard.getByTestId('room-row-0')).toBeVisible();

      // 3. Member opens their system_model room and sees the brick composed
      //    through from the shared room; the manual affordance stays hidden.
      await member.page.goto(`/app/sessions/${seededSession.sessionId}`);
      await member.page.getByTestId('stage-card-system_model').getByTestId('open-my-room').click();
      await member.page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
      await expect(member.page.getByTestId('builder-canvas')).toBeVisible();
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });
      await expect(member.page.getByTestId('bring-in-previous-model')).toHaveCount(0);
    } finally {
      await cleanupParticipant(facPage, member);
    }
  });
});
