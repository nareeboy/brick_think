// e2e/brick-reactions-comments.spec.ts
//
// Locks in: two room members on a shared_model canvas see each other's brick
// reactions and comments propagate live via Supabase Realtime within a few
// seconds. Alice (facilitator) and Bob (participant) are both members of a
// freshly-seeded shared_model room with a single canvas.
//
// Room seeding goes through /api/test/seed-shared-model-room (service-role)
// rather than the Manage rooms UI so the spec focuses on brick-feedback sync,
// not on the multi-step room-creation flow which is owned by the stage-rooms
// spec.

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

/** Service-role seed: one shared_model room with both Alice and Bob enrolled. */
async function seedSharedModelRoom(
  facilitatorPage: Page,
  sessionId: string,
  facilitatorEmail: string,
  memberProfileIds: string[],
): Promise<{ modelId: string; roomId: string }> {
  const res = await facilitatorPage.request.post('/api/test/seed-shared-model-room', {
    data: { sessionId, callerEmail: facilitatorEmail, memberProfileIds },
  });
  if (!res.ok()) {
    throw new Error(`seed-shared-model-room failed (${res.status()}): ${await res.text()}`);
  }
  return (await res.json()) as { modelId: string; roomId: string };
}

/**
 * Recover Alice's profile id from her Supabase auth cookie. The signedInPage
 * fixture exposes only her email; no test API route returns her id. The
 * cookie's value is a base64 JSON wrapper around the access-token JWT — we
 * decode the JWT body and pluck `sub`.
 */
async function readProfileIdFromAuthCookie(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  );
  if (!authCookie) throw new Error('no supabase auth cookie found');
  let raw = decodeURIComponent(authCookie.value);
  if (raw.startsWith('base64-')) raw = Buffer.from(raw.slice(7), 'base64').toString('utf8');
  const parsed = JSON.parse(raw) as { access_token?: string };
  if (!parsed.access_token) throw new Error('no access_token in auth cookie');
  const payloadB64 = parsed.access_token.split('.')[1] ?? '';
  const padded =
    payloadB64.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (payloadB64.length % 4)) % 4);
  const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { sub?: string };
  if (!payload.sub) throw new Error('no sub in JWT');
  return payload.sub;
}

test.describe('brick reactions + comments live sync', () => {
  test('two room members see reactions and comments propagate live', async ({
    signedInPage: alicePage,
    signedInEmail: aliceEmail,
    seededSession,
  }) => {
    // Phase 1+2 — Bob (second org member) signs in in a fresh context.
    const bob = await setUpParticipant(alicePage, seededSession.sessionId, aliceEmail);

    try {
      // Phase 3 — seed a single shared_model room with Alice + Bob via the
      // service-role test route. Skips the Manage rooms UI.
      const aliceProfileId = await readProfileIdFromAuthCookie(alicePage);
      const { modelId } = await seedSharedModelRoom(
        alicePage,
        seededSession.sessionId,
        aliceEmail,
        [aliceProfileId, bob.userId],
      );

      // Phase 4 — both navigate to the room canvas.
      const modelUrl = `/app/designs/${modelId}`;
      await alicePage.goto(modelUrl);
      await expect(alicePage.getByTestId('builder-canvas')).toBeVisible();
      await bob.page.goto(modelUrl);
      await expect(bob.page.getByTestId('builder-canvas')).toBeVisible();

      // Phase 5 — Alice places a brick; it propagates to Bob within 5s.
      await dropFirstBrickAt(alicePage, 250, 250);
      await expect(alicePage.getByTestId('placed-brick')).toHaveCount(1);
      await expect(bob.page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });

      // Pull the brick id from Alice's tab so we can target chips precisely.
      const brickId = await alicePage
        .getByTestId('placed-brick')
        .first()
        .getAttribute('data-brick-id');
      if (!brickId) throw new Error('placed brick has no data-brick-id');

      // Phase 6 — Alice opens reaction picker on the brick and picks 👍 (Agree).
      // The chip cluster lives in an overlay anchored to the brick; the opener
      // testid mirrors the brick id.
      await alicePage.getByTestId(`brick-reactions-${brickId}-add`).click();
      await alicePage.getByRole('menuitem', { name: 'Agree' }).click();

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
        alicePage
          .getByTestId(`brick-reactions-${brickId}`)
          .getByRole('button', { name: /2 👍 reactions/i }),
      ).toBeVisible({ timeout: 5000 });

      // Phase 9 — Alice toggles off; count falls back to 1 in both tabs.
      await alicePage
        .getByTestId(`brick-reactions-${brickId}`)
        .getByRole('button', { name: /2 👍 reactions, you reacted/i })
        .click();
      await expect(
        alicePage
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
      await alicePage.getByTestId(`brick-comment-indicator-${brickId}`).hover();
      await alicePage
        .getByTestId(`brick-comment-indicator-${brickId}`)
        .getByRole('button', { name: 'Add comment' })
        .click({ force: true });
      const aliceCommentDialog = alicePage.getByRole('dialog', { name: 'Comments' });
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
      const aliceChip = alicePage
        .getByTestId(`brick-comment-indicator-${brickId}`)
        .getByRole('button', { name: /^1 comment$/i });
      // The popover stays mounted after a successful Post (only the draft is
      // cleared); if it has been outside-clicked closed, re-open via the chip.
      if (await aliceChip.isVisible()) {
        await aliceChip.click();
      }
      await alicePage.getByRole('button', { name: 'Delete comment' }).click();

      // The indicator collapses back to the hover-revealed "+", which doesn't
      // carry a comment-count button. Verify both tabs lose the count chip.
      await expect(
        alicePage
          .getByTestId(`brick-comment-indicator-${brickId}`)
          .getByRole('button', { name: /\d+ comment/i }),
      ).toHaveCount(0, { timeout: 5000 });
      await expect(
        bob.page
          .getByTestId(`brick-comment-indicator-${brickId}`)
          .getByRole('button', { name: /\d+ comment/i }),
      ).toHaveCount(0, { timeout: 5000 });
    } finally {
      await cleanupParticipant(alicePage, bob);
    }
  });
});
