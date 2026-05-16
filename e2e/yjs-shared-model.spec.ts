import { expect, test } from './fixtures';

test.describe('yjs shared_model collaboration', () => {
  test('flag on: brick adds on shared_model propagate between two tabs', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Tab A — start the shared_model design.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    const modelUrl = page.url();

    // Tab B in a second context page (same cookie jar).
    const context = page.context();
    const pageB = await context.newPage();
    await pageB.goto(modelUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    // Add a brick in Tab A.
    await page.getByRole('button', { name: /open pieces/i }).click();
    const pieceA = page.getByTestId('piece-card').nth(0);
    const canvasA = page.getByTestId('builder-canvas');
    await expect(pieceA).toBeVisible();
    await expect(canvasA).toBeVisible();
    const pieceBox = await pieceA.boundingBox();
    const canvasBox = await canvasA.boundingBox();
    if (!pieceBox || !canvasBox) throw new Error('measurement failed');
    await page.mouse.move(
      pieceBox.x + pieceBox.width / 2,
      pieceBox.y + pieceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);

    // The brick must show up in Tab B within 5 s — propagated via Yjs.
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
      timeout: 5000,
    });
  });

  test('individual_model stage continues to use autosave (no yjs binding)', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    // SaveStatus is the autosave indicator. It transitions to data-status="saved"
    // after the first PATCH — proves the autosave path is active.
    await page.getByRole('button', { name: /open pieces/i }).click();
    const piece = page.getByTestId('piece-card').nth(0);
    const canvas = page.getByTestId('builder-canvas');
    const pieceBox = await piece.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!pieceBox || !canvasBox) throw new Error('measurement failed');
    await page.mouse.move(
      pieceBox.x + pieceBox.width / 2,
      pieceBox.y + pieceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );
    // The presence overlay must not be active on a non-shared stage.
    await expect(
      page.locator('[data-testid^="presence-cursor-"]'),
    ).toHaveCount(0);
  });
});
