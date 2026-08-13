// e2e/brick-reactions-comments.spec.ts
//
// Locks in: two room members on a shared_model canvas see each other's brick
// reactions and comments propagate live via Supabase Realtime within a few
// seconds. Since the stage-rooms rework the facilitator observes rooms
// READ-ONLY, so both actors are seeded PARTICIPANT org members ("Alice" and
// "Bob") enrolled in a freshly-seeded shared_model room with a single canvas;
// the facilitator fixture user only drives the service-role seed routes.
//
// Room seeding goes through /api/test/seed-shared-model-room (service-role)
// rather than the Manage rooms UI so the spec focuses on brick-feedback sync,
// not on the multi-step room-creation flow which is owned by the stage-rooms
// spec.

import {
  cleanupParticipant,
  dropFirstBrickAt,
  expect,
  seedStageRoom,
  setUpParticipant,
  test,
} from './fixtures';

test.describe('brick reactions + comments live sync', () => {
  test('two room members see reactions and comments propagate live', async ({
    signedInPage: facPage,
    signedInEmail: facEmail,
    seededSession,
  }) => {
    // Phase 1+2 — Alice and Bob (participant org members) sign in in fresh
    // contexts.
    const alice = await setUpParticipant(facPage, seededSession.sessionId, facEmail);
    const bob = await setUpParticipant(facPage, seededSession.sessionId, facEmail);

    try {
      // Phase 3 — seed a single shared_model room with Alice + Bob via the
      // service-role test route. Skips the Manage rooms UI.
      const { modelId } = await seedStageRoom(facPage, seededSession.sessionId, facEmail, [
        alice.userId,
        bob.userId,
      ]);

      // Phase 4 — both navigate to the room canvas.
      const modelUrl = `/app/designs/${modelId}`;
      await alice.page.goto(modelUrl);
      await expect(alice.page.getByTestId('builder-canvas')).toBeVisible();
      await bob.page.goto(modelUrl);
      await expect(bob.page.getByTestId('builder-canvas')).toBeVisible();

      // Phase 5 — Alice places a brick; it propagates to Bob within 5s.
      await dropFirstBrickAt(alice.page, 250, 250);
      await expect(alice.page.getByTestId('placed-brick')).toHaveCount(1);
      await expect(bob.page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });

      // Pull the brick id from Alice's tab so we can target chips precisely.
      const brickId = await alice.page
        .getByTestId('placed-brick')
        .first()
        .getAttribute('data-brick-id');
      if (!brickId) throw new Error('placed brick has no data-brick-id');

      // Phase 6 — Alice opens reaction picker on the brick and picks 👍 (Agree).
      // The chip cluster lives in an overlay anchored to the brick; the opener
      // testid mirrors the brick id.
      await alice.page.getByTestId(`brick-reactions-${brickId}-add`).click();
      await alice.page.getByRole('menuitem', { name: 'Agree' }).click();

      // Phase 7 — Bob sees the 👍 chip with count 1 appear within 5s.
      const bobChip = bob.page
        .getByTestId(`brick-reactions-${brickId}`)
        .getByRole('button', { name: /1 👍 reaction/i });
      await expect(bobChip).toBeVisible({ timeout: 5000 });

      // Phase 8 — Bob toggles his own; count rises to 2 in both tabs.
      await bobChip.click();
      await expect(
        bob.page
          .getByTestId(`brick-reactions-${brickId}`)
          .getByRole('button', { name: /2 👍 reactions/i }),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        alice.page
          .getByTestId(`brick-reactions-${brickId}`)
          .getByRole('button', { name: /2 👍 reactions/i }),
      ).toBeVisible({ timeout: 5000 });

      // Phase 9 — Alice toggles off; count falls back to 1 in both tabs.
      await alice.page
        .getByTestId(`brick-reactions-${brickId}`)
        .getByRole('button', { name: /2 👍 reactions, you reacted/i })
        .click();
      await expect(
        alice.page
          .getByTestId(`brick-reactions-${brickId}`)
          .getByRole('button', { name: /1 👍 reaction/i }),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        bob.page
          .getByTestId(`brick-reactions-${brickId}`)
          .getByRole('button', { name: /1 👍 reaction/i }),
      ).toBeVisible({ timeout: 5000 });

      // Phase 10 — Alice opens the comment popover and posts a comment.
      // The empty-state opener is opacity-0 until hover; force-click it so we
      // don't need to coax CSS hover state into firing. The PiecesDrawer
      // contains a piece called "Post grey small" which also matches the role
      // name "Post" — scope to the popover dialog to avoid the collision.
      await alice.page.getByTestId(`brick-comment-indicator-${brickId}`).hover();
      await alice.page
        .getByTestId(`brick-comment-indicator-${brickId}`)
        .getByRole('button', { name: 'Add comment' })
        .click({ force: true });
      const aliceCommentDialog = alice.page.getByRole('dialog', { name: 'Comments' });
      await expect(aliceCommentDialog).toBeVisible();
      await aliceCommentDialog.getByPlaceholder('Add a comment…').fill('love this build');
      await aliceCommentDialog.getByRole('button', { name: 'Post' }).click();

      // Phase 11 — Bob sees the comment indicator update to count 1.
      const bobCommentChip = bob.page
        .getByTestId(`brick-comment-indicator-${brickId}`)
        .getByRole('button', { name: /^1 comment$/i });
      await expect(bobCommentChip).toBeVisible({ timeout: 5000 });
      await bobCommentChip.click();
      await expect(bob.page.getByText('love this build')).toBeVisible();

      // Phase 12 — Alice deletes her own comment; indicator disappears for both.
      // Alice's popover may have closed when she clicked Post (it stays open
      // here — composer just clears) — re-open to find her own row.
      const aliceChip = alice.page
        .getByTestId(`brick-comment-indicator-${brickId}`)
        .getByRole('button', { name: /^1 comment$/i });
      // The popover stays mounted after a successful Post (only the draft is
      // cleared); if it has been outside-clicked closed, re-open via the chip.
      if (await aliceChip.isVisible()) {
        await aliceChip.click();
      }
      await alice.page.getByRole('button', { name: 'Delete comment' }).click();

      // The indicator collapses back to the hover-revealed "+", which doesn't
      // carry a comment-count button. Verify both tabs lose the count chip.
      await expect(
        alice.page
          .getByTestId(`brick-comment-indicator-${brickId}`)
          .getByRole('button', { name: /\d+ comment/i }),
      ).toHaveCount(0, { timeout: 5000 });
      await expect(
        bob.page
          .getByTestId(`brick-comment-indicator-${brickId}`)
          .getByRole('button', { name: /\d+ comment/i }),
      ).toHaveCount(0, { timeout: 5000 });
    } finally {
      await cleanupParticipant(facPage, alice);
      await cleanupParticipant(facPage, bob);
    }
  });
});
