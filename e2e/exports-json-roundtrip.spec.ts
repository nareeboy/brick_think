import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

async function dragPieceOntoCanvas(page: Page): Promise<void> {
  const piece = page.getByTestId('piece-card').nth(0);
  const canvas = page.getByTestId('builder-canvas');
  await expect(piece).toBeVisible();
  await expect(canvas).toBeVisible();
  const pieceBox = await piece.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!pieceBox || !canvasBox) throw new Error('Could not measure piece or canvas bounding boxes');
  await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 220, canvasBox.y + 220, { steps: 12 });
  await page.mouse.up();
}

async function brickIdsOnPage(page: Page): Promise<string[]> {
  const ids = await page
    .getByTestId('placed-brick')
    .evaluateAll((els) =>
      els
        .map((el) => el.getAttribute('data-brick-id'))
        .filter((id): id is string => typeof id === 'string'),
    );
  return ids;
}

test('JSON export round-trips: imported design matches source bricks', async ({
  signedInPage: page,
}) => {
  // Create Design A.
  await page.goto('/app/my-designs');
  await page.getByTestId('new-design-button').click();
  await page.getByTestId('destination-personal').click();
  await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  await expect(page.getByTestId('builder-canvas')).toBeVisible();

  // Place a brick + wait for autosave to flush so the canvas_state row is in
  // the DB before we download (the JSON export reads from in-memory live
  // state on Builder, but a saved row is needed if anything later re-reads).
  await page.getByRole('button', { name: /open pieces/i }).click();
  await dragPieceOntoCanvas(page);
  await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
    timeout: 15_000,
  });

  const idsA = await brickIdsOnPage(page);
  expect(idsA.length).toBe(1);

  // Download JSON.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByTestId('export-menu-trigger').click();
      await page.getByRole('menuitem', { name: /json/i }).click();
    })(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  // Import.
  await page.goto('/app/my-designs');
  await page.getByRole('button', { name: /^import design$/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/design file/i).setInputFiles(downloadPath);
  await page.getByRole('button', { name: /^import$/i }).click();
  await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  await expect(page.getByTestId('builder-canvas')).toBeVisible();

  // The imported design should render the same set of brick ids — the
  // envelope copies the canvas state verbatim so brick ids carry through.
  await expect(page.getByTestId('placed-brick')).toHaveCount(idsA.length);
  const idsB = await brickIdsOnPage(page);
  expect(idsB.sort()).toEqual(idsA.sort());
});
