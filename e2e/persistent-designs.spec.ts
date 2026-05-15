import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';

// The builder uses a custom pointer-event drag system (not HTML5 drag), so
// Playwright's locator.dragTo() doesn't fire the right events. We synthesize
// the gesture via page.mouse.* — startDrag in components/builder/dragPiece.tsx
// listens on pointermove/pointerup attached to window after onPointerDown.
async function dragPieceOntoCanvas(
  page: Page,
  pieceIndex = 0,
  dropOffset: { x: number; y: number } = { x: 120, y: 240 },
): Promise<{ dropX: number; dropY: number }> {
  const piece = page.getByTestId('piece-card').nth(pieceIndex);
  const canvas = page.getByTestId('builder-canvas');
  await expect(piece).toBeVisible();
  await expect(canvas).toBeVisible();

  const pieceBox = await piece.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!pieceBox || !canvasBox) {
    throw new Error('Could not measure piece or canvas bounding boxes');
  }

  const startX = pieceBox.x + pieceBox.width / 2;
  const startY = pieceBox.y + pieceBox.height / 2;
  const dropX = canvasBox.x + dropOffset.x;
  const dropY = canvasBox.y + dropOffset.y;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Take several steps so the drag threshold trips and overCanvas evaluates
  // mid-drag rather than only on the final pointer-up.
  await page.mouse.move(dropX, dropY, { steps: 12 });
  await page.mouse.up();

  return { dropX, dropY };
}

test.describe('persistent designs', () => {
  test('a brick survives a page refresh', async ({ signedInPage: page }) => {
    await page.goto('/app/my-designs');
    await expect(
      page.getByRole('heading', { name: /my designs/i, level: 1 }),
    ).toBeVisible();

    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await page.getByRole('button', { name: /open pieces/i }).click();
    await dragPieceOntoCanvas(page);

    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );

    const beforeUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(beforeUrl);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });

  test('save and restore a version', async ({ signedInPage: page }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await page.getByRole('button', { name: /open pieces/i }).click();
    await dragPieceOntoCanvas(page);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );

    // Open the "Save version" modal from the sidebar (the trigger button is
    // also labelled "Save version", so scope the submit button to the dialog).
    await page.getByRole('button', { name: /^save version$/i }).click();
    const versionDialog = page.getByRole('dialog', { name: /save version/i });
    await versionDialog.getByLabel(/label/i).fill('v1');
    await versionDialog.getByRole('button', { name: /^save version$/i }).click();
    await expect(versionDialog).toBeHidden();

    // Delete the placed brick via the LayersPanel row — clean DOM target
    // independent of the Konva canvas hit-testing.
    await page.getByRole('button', { name: /^delete piece$/i }).click();
    await expect(page.getByTestId('placed-brick')).toHaveCount(0);
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );

    // Open version history. The trigger button has the accessible label
    // "Version history" (aria-label overrides its visible "History" text), so
    // match on that. The opened panel exposes the same accessible name via
    // aria-labelledby, hence the role-filtered locator below.
    await page.getByRole('button', { name: /version history/i }).click();
    const historyDialog = page.getByRole('dialog', {
      name: /version history/i,
    });
    await expect(historyDialog).toBeVisible();
    await expect(historyDialog.getByText('v1')).toBeVisible();

    await historyDialog
      .getByRole('button', { name: /^restore$/i })
      .first()
      .click();

    // The confirm dialog is rendered inside the history aside (which itself is
    // a role="dialog"), so locating "the dialog with the confirm heading"
    // matches both. The confirm's Restore button is rendered after the row
    // Restore in DOM order, so .last() reliably picks it.
    await expect(
      page.getByRole('heading', { name: /restore this version/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /^restore$/i }).last().click();

    // restoreVersionAction triggers window.location.reload(); wait for the
    // canvas to come back and the brick to re-hydrate from the snapshot.
    await expect(page.getByTestId('builder-canvas')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('placed-brick')).toHaveCount(1, {
      timeout: 15_000,
    });
  });

  test('a thumbnail appears on the card after first edit + reload', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const designId = page.url().split('/').pop();
    if (!designId) throw new Error('could not extract design id from url');

    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await page.getByRole('button', { name: /open pieces/i }).click();
    await dragPieceOntoCanvas(page);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );

    // The thumbnail upload is fire-and-forget after the first save→saved
    // transition. Give it a moment to complete before navigating away.
    await page.waitForTimeout(2000);

    await page.goto('/app/my-designs');
    // Locate the card by the <a> element's own href — filter({ has }) only
    // searches descendants, so it cannot match the <a>'s own href attribute.
    const card = page.locator(`a[href$="${designId}"]`);
    const thumb = card.getByTestId('design-thumb').locator('img');
    await expect(thumb).toBeVisible({ timeout: 5000 });
    const src = await thumb.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('model-thumbnails');
  });
});
