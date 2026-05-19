import type { Page } from '@playwright/test';

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

test.describe('bring in my previous model', () => {
  test('shared_model: clicker bricks propagate to peer + button hides afterwards', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // 1. Build an individual_model with one brick.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await dropFirstBrickAt(page, 220, 220);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    // The server-side import action reads canvas_state from the row, so the
    // autosave PATCH for the brick add must land before we navigate away.
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    // 2. Back to the session page; start the shared_model.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-shared_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    const sharedUrl = page.url();

    // 3. The empty-state button is visible.
    const button = page.getByTestId('bring-in-previous-model');
    await expect(button).toBeVisible();

    // 4. Tab B opens the same shared_model URL.
    const pageB = await page.context().newPage();
    await pageB.goto(sharedUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    // 5. Click the button on Tab A.
    await button.click();

    // 6. Brick appears on Tab A and propagates to Tab B within the Yjs budget.
    await expect(page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });

    // 7. The button is gone on Tab A (alreadyImported gate).
    await page.reload();
    await expect(page.getByTestId('bring-in-previous-model')).toHaveCount(0);
  });

  test('system_model: server-copied bricks visible after reload', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // 1. Seed the individual_model with a brick.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    // Wait for autosave to persist the canvas_state before navigating away —
    // shared_model bring-in reads source via the same row.
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    // 2. Start the shared_model so the session has a populated shared row
    //    (system_model pulls from session_shared shared_model).
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-shared_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    // If the flag is on, click "bring in" to seed the shared canvas; if off,
    // drop a brick manually so the shared_model isn't empty.
    const inButton = page.getByTestId('bring-in-previous-model');
    if (await inButton.isVisible()) {
      await inButton.click();
      await expect(page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 5000 });
    } else {
      await dropFirstBrickAt(page, 220, 220);
      await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    }
    // shared_model writes through the Yjs worker, which debounces its
    // models.canvas_state projection by YJS_PERSIST_DEBOUNCE_MS (500ms in
    // playwright.config.ts). system_model's server-side import reads that
    // canvas_state directly, so we must wait for the projection to land
    // before navigating away. 1.5s = debounce + DB write headroom.
    await page.waitForTimeout(1500);

    // 3. Open the system_model and click "bring in".
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-system_model')
      .getByTestId('start-model-system_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const systemButton = page.getByTestId('bring-in-previous-model');
    await expect(systemButton).toBeVisible();
    await systemButton.click();
    // Server-copied branch triggers window.location.reload(); wait for the
    // bricks to render after the reload.
    await expect(page.getByTestId('placed-brick')).toHaveCount(1, { timeout: 10000 });
    await expect(page.getByTestId('bring-in-previous-model')).toHaveCount(0);
  });
});
