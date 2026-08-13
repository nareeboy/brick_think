// e2e/yjs-shared-model.spec.ts
//
// Live (Yjs) collaboration on the shared_model stage.
//
// Since the stage-rooms rework, shared_model is room-backed: only ROOM
// MEMBERS build in the canvas and the session facilitator observes
// read-only (lib/models/readOnly.ts). The old "facilitator clicks
// start-model-shared_model" entry point no longer exists — each test seeds a
// participant org member plus a single room containing them (via the
// service-role /api/test/seed-shared-model-room route) and drives that
// member's browser context. Two-tab propagation tests open a second page in
// the same context (same user, distinct Yjs clients).

import type { Page } from '@playwright/test';

import {
  cleanupParticipant,
  dropFirstBrickAt,
  expect,
  seedStageRoom,
  setUpParticipant,
  test,
  type ParticipantSetup,
} from './fixtures';

interface RoomSetup {
  member: ParticipantSetup;
  modelUrl: string;
}

async function openSharedRoom(
  facPage: Page,
  facEmail: string,
  sessionId: string,
): Promise<RoomSetup> {
  const member = await setUpParticipant(facPage, sessionId, facEmail);
  const { modelId } = await seedStageRoom(facPage, sessionId, facEmail, [member.userId]);
  const modelUrl = `/app/designs/${modelId}`;
  await member.page.goto(modelUrl);
  await expect(member.page.getByTestId('builder-canvas')).toBeVisible();
  return { member, modelUrl };
}

async function openSecondTab(member: ParticipantSetup, modelUrl: string): Promise<Page> {
  const pageB = await member.context.newPage();
  await pageB.goto(modelUrl);
  await expect(pageB.getByTestId('builder-canvas')).toBeVisible();
  return pageB;
}

test.describe('yjs shared_model collaboration', () => {
  test('flag on: brick adds on shared_model propagate between two tabs', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      // Add a brick in Tab A.
      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);

      // The brick must show up in Tab B within 5 s — propagated via Yjs.
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 5000,
      });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('individual_model stage continues to use autosave (no yjs binding)', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    // SaveStatus is the autosave indicator. It transitions to data-status="saved"
    // after the first PATCH — proves the autosave path is active.
    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });
    // The presence overlay must not be active on a non-shared stage.
    await expect(page.locator('[data-testid^="presence-cursor-"]')).toHaveCount(0);
  });

  test('flag on: peer renders avatar + name chip on shared_model', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      // Move the cursor in Tab A so Tab A publishes a cursor coord.
      const canvasA = member.page.getByTestId('builder-canvas');
      const boxA = await canvasA.boundingBox();
      if (!boxA) throw new Error('canvas A box missing');
      await member.page.mouse.move(boxA.x + 150, boxA.y + 150);

      // Tab B should see exactly one peer cursor (Tab A) with avatar + chip.
      const peerCursors = pageB.locator('[data-testid^="presence-cursor-"]');
      await expect(peerCursors).toHaveCount(1, { timeout: 5000 });
      const cursor = peerCursors.first();
      const nameChip = cursor.locator('[data-testid^="presence-name-"]');
      await expect(nameChip).toBeVisible();
      const nameText = await nameChip.textContent();
      expect(nameText?.trim().length).toBeGreaterThan(0);
      // E2E test profiles have no avatar_url, so the initial-letter fallback
      // renders (covers the `displayName.charAt(0).toUpperCase()` branch).
      const initial = cursor.locator('[data-testid^="presence-initial-"]');
      await expect(initial).toBeVisible();
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('Cmd+Z undoes a local brick add and propagates to peer', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 5000,
      });

      const canvasBox = await member.page.getByTestId('builder-canvas').boundingBox();
      if (!canvasBox) throw new Error('canvas measurement failed');
      await member.page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

      await member.page.keyboard.press('Meta+KeyZ');
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(0);
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(0, {
        timeout: 5000,
      });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('per-client isolation: tab A undo does not affect tab B brick', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
      await dropFirstBrickAt(pageB, 400, 400);
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(2, {
        timeout: 5000,
      });
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(2, {
        timeout: 5000,
      });

      const canvasBox = await member.page.getByTestId('builder-canvas').boundingBox();
      if (!canvasBox) throw new Error('canvas measurement failed');
      await member.page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
      await member.page.keyboard.press('Meta+KeyZ');

      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 5000,
      });
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 5000,
      });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('Cmd+Shift+Z redoes the undone op', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member } = await openSharedRoom(page, signedInEmail, seededSession.sessionId);
    try {
      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);

      const canvasBox = await member.page.getByTestId('builder-canvas').boundingBox();
      if (!canvasBox) throw new Error('canvas measurement failed');
      await member.page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

      await member.page.keyboard.press('Meta+KeyZ');
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(0);

      await member.page.keyboard.press('Meta+Shift+KeyZ');
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('toolbar undo button undoes a local brick add', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member } = await openSharedRoom(page, signedInEmail, seededSession.sessionId);
    try {
      const undoButton = member.page.getByTestId('builder-undo');
      const redoButton = member.page.getByTestId('builder-redo');
      await expect(undoButton).toBeDisabled();
      await expect(redoButton).toBeDisabled();

      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
      await expect(undoButton).toBeEnabled();

      await undoButton.click();
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(0);
      await expect(redoButton).toBeEnabled();

      await redoButton.click();
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('remote undo announcement renders a toast on the peer tab', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });

      // Click empty canvas in tab A so the undo keystroke isn't swallowed
      // by a focused control, then press undo.
      const canvasBox = await member.page.getByTestId('builder-canvas').boundingBox();
      if (!canvasBox) throw new Error('canvas measurement failed');
      await member.page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
      await member.page.keyboard.press('Meta+KeyZ');

      // Tab B should see the brick removed AND a toast announcing the undo.
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(0, { timeout: 5000 });
      await expect(pageB.getByText(/undid a change/i)).toBeVisible({ timeout: 5000 });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('Cmd+Z is suppressed while the title input is focused', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member } = await openSharedRoom(page, signedInEmail, seededSession.sessionId);
    try {
      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);

      await member.page.getByRole('button', { name: /rename model/i }).click();
      const titleInput = member.page.getByRole('textbox', { name: /model name/i });
      await expect(titleInput).toBeFocused();
      await titleInput.type(' edit');

      await member.page.keyboard.press('Meta+KeyZ');
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('autosave path: Cmd+Z is a no-op on a non-live (individual_model) design', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    const canvasBox = await page.getByTestId('builder-canvas').boundingBox();
    if (!canvasBox) throw new Error('canvas measurement failed');
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

    await page.keyboard.press('Meta+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });

  test('flag on: tab B sees tab A in the People Here strip', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      // Move cursor in A so A publishes a presence payload.
      const canvasA = member.page.getByTestId('builder-canvas');
      const boxA = await canvasA.boundingBox();
      if (!boxA) throw new Error('canvas A box missing');
      await member.page.mouse.move(boxA.x + 150, boxA.y + 150);

      // Strip on B should show self (B) + the peer (A) — 2 avatars total.
      const avatars = pageB.locator('[data-testid^="people-here-avatar-"]');
      await expect(avatars).toHaveCount(2, { timeout: 5000 });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('flag on: peer selection renders an outline that clears on deselect', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      // A drops a brick; both tabs see it.
      await dropFirstBrickAt(member.page, 200, 200);
      await expect(member.page.getByTestId('placed-brick')).toHaveCount(1);
      await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
        timeout: 5000,
      });

      // A clicks the brick to select it.
      const canvasA = await member.page.getByTestId('builder-canvas').boundingBox();
      if (!canvasA) throw new Error('canvas A box missing');
      await member.page.mouse.click(canvasA.x + 200, canvasA.y + 200);

      // B should see exactly one peer-outline element appear.
      const outlinesB = pageB.locator('[data-testid^="peer-outline-"]');
      await expect(outlinesB).toHaveCount(1, { timeout: 5000 });

      // A clicks empty area to deselect; outline disappears on B.
      await member.page.mouse.click(canvasA.x + 30, canvasA.y + 30);
      await expect(outlinesB).toHaveCount(0, { timeout: 5000 });
    } finally {
      await cleanupParticipant(page, member);
    }
  });

  test('flag on: closing tab A removes its avatar from tab B strip', async ({
    signedInPage: page,
    signedInEmail,
    seededSession,
  }) => {
    const { member, modelUrl } = await openSharedRoom(
      page,
      signedInEmail,
      seededSession.sessionId,
    );
    try {
      const pageB = await openSecondTab(member, modelUrl);

      const canvasA = member.page.getByTestId('builder-canvas');
      const boxA = await canvasA.boundingBox();
      if (!boxA) throw new Error('canvas A box missing');
      await member.page.mouse.move(boxA.x + 100, boxA.y + 100);

      await expect(pageB.locator('[data-testid^="people-here-avatar-"]')).toHaveCount(2, {
        timeout: 5000,
      });

      await member.page.close();

      // B should drop back to self only.
      await expect(pageB.locator('[data-testid^="people-here-avatar-"]')).toHaveCount(1, {
        timeout: 10_000,
      });
    } finally {
      await cleanupParticipant(page, member);
    }
  });
});
