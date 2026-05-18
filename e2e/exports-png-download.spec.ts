import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

// Builder drag uses pointermove/pointerup attached to window. Reuses the
// recipe from persistent-designs.spec.ts so the gesture trips the drag
// threshold before the drop evaluates overCanvas.
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

test('user can download a PNG of a design from the Builder', async ({ signedInPage: page }) => {
  await page.goto('/app/my-designs');
  await expect(page.getByRole('heading', { name: /my designs/i, level: 1 })).toBeVisible();

  await page.getByTestId('new-design-button').click();
  await page.getByTestId('destination-personal').click();
  await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  await expect(page.getByTestId('builder-canvas')).toBeVisible();

  await page.getByRole('button', { name: /open pieces/i }).click();
  await dragPieceOntoCanvas(page);
  await expect(page.getByTestId('placed-brick')).toHaveCount(1);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByTestId('export-menu-trigger').click();
      await page.getByRole('menuitem', { name: /png image/i }).click();
    })(),
  ]);

  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const buf = await readFile(filePath);
  // Sanity: enough bytes for header + at least an IDAT chunk.
  expect(buf.length).toBeGreaterThan(200);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A.
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(buf.subarray(0, 8).equals(signature)).toBe(true);
});
