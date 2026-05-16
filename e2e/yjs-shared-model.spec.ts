import { expect, test } from './fixtures';

async function dropFirstBrickAt(
  page: import('@playwright/test').Page,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await page.getByRole('button', { name: /open pieces/i }).click();
  const piece = page.getByTestId('piece-card').nth(0);
  const canvas = page.getByTestId('builder-canvas');
  await piece.waitFor();
  await canvas.waitFor();
  const pieceBox = await piece.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!pieceBox || !canvasBox) throw new Error('measurement failed');
  await page.mouse.move(
    pieceBox.x + pieceBox.width / 2,
    pieceBox.y + pieceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + offsetX, canvasBox.y + offsetY, {
    steps: 12,
  });
  await page.mouse.up();
}

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

  test('flag on: peer renders avatar + name chip on shared_model', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Tab A starts the shared_model.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    const modelUrl = page.url();

    // Tab B in a second page (same cookie jar → same user).
    const pageB = await page.context().newPage();
    await pageB.goto(modelUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    // Move the cursor in Tab A so Tab A publishes a cursor coord.
    const canvasA = page.getByTestId('builder-canvas');
    const boxA = await canvasA.boundingBox();
    if (!boxA) throw new Error('canvas A box missing');
    await page.mouse.move(boxA.x + 150, boxA.y + 150);

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
  });

  test('Cmd+Z undoes a local brick add and propagates to peer', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    const modelUrl = page.url();

    const pageB = await page.context().newPage();
    await pageB.goto(modelUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
      timeout: 5000,
    });

    const canvasBox = await page.getByTestId('builder-canvas').boundingBox();
    if (!canvasBox) throw new Error('canvas measurement failed');
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

    await page.keyboard.press('Meta+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(0);
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(0, {
      timeout: 5000,
    });
  });

  test('per-client isolation: Alice undo does not affect Bob brick', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    const modelUrl = page.url();

    const pageB = await page.context().newPage();
    await pageB.goto(modelUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await dropFirstBrickAt(pageB, 400, 400);
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(2, {
      timeout: 5000,
    });
    await expect(page.getByTestId('placed-brick')).toHaveCount(2, {
      timeout: 5000,
    });

    const canvasBox = await page.getByTestId('builder-canvas').boundingBox();
    if (!canvasBox) throw new Error('canvas measurement failed');
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
    await page.keyboard.press('Meta+KeyZ');

    await expect(page.getByTestId('placed-brick')).toHaveCount(1, {
      timeout: 5000,
    });
    await expect(pageB.getByTestId('placed-brick')).toHaveCount(1, {
      timeout: 5000,
    });
  });

  test('Cmd+Shift+Z redoes the undone op', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);

    const canvasBox = await page.getByTestId('builder-canvas').boundingBox();
    if (!canvasBox) throw new Error('canvas measurement failed');
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

    await page.keyboard.press('Meta+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(0);

    await page.keyboard.press('Meta+Shift+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });

  test('Cmd+Z is suppressed while the title input is focused', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-shared_model')
      .getByTestId('start-model-button')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);

    await page.getByRole('button', { name: /rename model/i }).click();
    const titleInput = page.getByRole('textbox', { name: /model name/i });
    await expect(titleInput).toBeFocused();
    await titleInput.type(' edit');

    await page.keyboard.press('Meta+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });

  test('autosave path: Cmd+Z is a no-op on a non-live (individual_model) design', async ({
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

    await dropFirstBrickAt(page, 200, 200);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
    await expect(page.getByTestId('save-status')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 15_000 },
    );

    const canvasBox = await page.getByTestId('builder-canvas').boundingBox();
    if (!canvasBox) throw new Error('canvas measurement failed');
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);

    await page.keyboard.press('Meta+KeyZ');
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });
});
