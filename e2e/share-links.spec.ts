import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';

async function placeOneBrick(page: Page): Promise<void> {
  const piece = page.getByTestId('piece-card').first();
  const canvas = page.getByTestId('builder-canvas');
  await expect(piece).toBeVisible();
  await expect(canvas).toBeVisible();
  const pBox = await piece.boundingBox();
  const cBox = await canvas.boundingBox();
  if (!pBox || !cBox) throw new Error('No bounding boxes');
  await page.mouse.move(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cBox.x + 120, cBox.y + 240, { steps: 12 });
  await page.mouse.up();
}

test.describe('public sharing links', () => {
  test('create → view in incognito → revoke → friendly page', async ({
    signedInPage: page,
    browser,
  }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await page.getByRole('button', { name: /open pieces/i }).click();
    await placeOneBrick(page);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    // Grant clipboard permission so navigator.clipboard.writeText() inside
    // ShareModal.onCreate() doesn't throw before reload() is called.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByTestId('share-button').click();
    const dialog = page.getByRole('dialog', { name: /share this design/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/link expires after/i).selectOption('7d');
    await dialog.getByRole('button', { name: /^create link$/i }).click();

    const row = dialog.getByTestId('share-link-row').first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    const url = await row.locator('code').innerText();
    expect(url).toMatch(/\/share\/[A-Za-z0-9_-]{32,}$/);

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(url);
    await expect(guestPage.getByTestId('placed-brick')).toHaveCount(1);
    await expect(guestPage.getByTestId('share-button')).toHaveCount(0);
    await expect(guestPage.getByRole('button', { name: /^save version$/i })).toHaveCount(0);
    await expect(guestPage.getByRole('button', { name: /version history/i })).toHaveCount(0);

    await page.bringToFront();
    // Wait for the revokeShareLink server action to complete before reloading
    // the guest page. The action fires after click; we intercept the POST
    // response so we know the DB write is committed.
    const revokeResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/app/designs/'),
    );
    await row.getByRole('button', { name: /^revoke$/i }).click();
    await revokeResponse;
    await expect(dialog.getByTestId('share-link-row')).toHaveCount(0);

    await guestPage.reload();
    await expect(guestPage.getByRole('heading', { name: /no longer active/i })).toBeVisible();

    await guestContext.close();
  });

  test('soft-deleted model collapses share link to a 404', async ({
    signedInPage: page,
    browser,
  }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await page.getByRole('button', { name: /open pieces/i }).click();
    await placeOneBrick(page);
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    // Grant clipboard permission so navigator.clipboard.writeText() inside
    // ShareModal.onCreate() doesn't throw before reload() is called.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByTestId('share-button').click();
    const dialog = page.getByRole('dialog', { name: /share this design/i });
    await dialog.getByLabel(/link expires after/i).selectOption('1d');
    await dialog.getByRole('button', { name: /^create link$/i }).click();
    await expect(dialog.getByTestId('share-link-row').first()).toBeVisible({ timeout: 20_000 });
    const url = await dialog.getByTestId('share-link-row').first().locator('code').innerText();

    await page.goto('/app/my-designs');
    // The delete button is the TrashIcon button on each DesignCard row.
    // Its accessible name is `Delete ${model.title}` — newly created designs
    // default to "Untitled model". We use a loose /^delete /i regex so the
    // test is robust to any auto-assigned title.
    await page.getByRole('button', { name: /^delete /i }).first().click();
    // The confirm dialog's destructive action is "Delete".
    // Wait for the deleteModelAction server action to finish before visiting
    // the share URL — the page re-validates and the delete card disappears.
    const deleteResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/app/my-designs'),
    );
    await page.getByRole('button', { name: /^delete$/i }).click();
    await deleteResponse;

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const response = await guestPage.goto(url);
    expect(response?.status()).toBe(404);
    await guestContext.close();
  });
});
