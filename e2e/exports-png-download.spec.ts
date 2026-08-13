import { readFile } from 'node:fs/promises';

import { expect, test, dropFirstBrickAt } from './fixtures';

test('user can download a PNG of a design from the Builder', async ({ signedInPage: page }) => {
  await page.goto('/app/my-designs');
  await expect(page.getByRole('heading', { name: /my designs/i, level: 1 })).toBeVisible();

  await page.getByTestId('new-design-button').click();
  await page.getByTestId('destination-personal').click();
  await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  await expect(page.getByTestId('builder-canvas')).toBeVisible();

  await dropFirstBrickAt(page, 220, 220);
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
