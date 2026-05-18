import { test, expect } from './fixtures';

test.describe('session-scoped designs', () => {
  test('start, edit, refresh, reopen a stage model', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Land on the session page.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(page.getByTestId('session-title')).toBeVisible();

    // Stage cards render in canonical order.
    await expect(page.getByTestId('stage-card-individual_model')).toBeVisible();

    // Click "Start your model" on the individual_model stage.
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-breadcrumb')).toBeVisible();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    // Open the pieces drawer so piece-card elements become interactive.
    await page.getByRole('button', { name: /open pieces/i }).click();

    // Add a brick (drag the first piece onto the canvas) so we have state
    // to autosave + recover.
    const piece = page.getByTestId('piece-card').nth(0);
    const canvas = page.getByTestId('builder-canvas');
    await expect(piece).toBeVisible();
    await expect(canvas).toBeVisible();
    const pieceBox = await piece.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!pieceBox || !canvasBox) throw new Error('measurement failed');
    await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);

    // Wait for autosave to land. The save-status indicator transitions to
    // data-status="saved" once the PATCH completes.
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', {
      timeout: 15_000,
    });

    // Reload the builder to verify the saved state survives a page refresh
    // (the "refresh" in the test title), then also navigate away and back.
    await page.reload();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    // Capture the URL so we can navigate back after navigating away.
    const builderUrl = page.url();

    // Navigate back to the session page; the card should now show "Open".
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('open-model-individual_model')
      .click();
    await page.waitForURL(builderUrl);
    await expect(page.getByTestId('placed-brick')).toHaveCount(1);
  });

  test('session-scoped model is hidden from the Personal filter on My Designs', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Create a session model so it definitely exists.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const sessionModelUrl = page.url();
    const sessionModelId = sessionModelUrl.match(/\/app\/designs\/([0-9a-f-]+)/)?.[1] ?? '';
    expect(sessionModelId).not.toBe('');

    // Visit My Designs under the Personal filter — session-scoped models
    // should be filtered out from the personal view.
    await page.goto('/app/my-designs?filter=personal');
    await expect(page.getByRole('heading', { level: 1, name: /my designs/i })).toBeVisible();
    // Cards link to /app/designs/<id>; a card link containing the session
    // model's id would mean it leaked into the Personal filter view.
    const leak = page.locator(`a[href="/app/designs/${sessionModelId}"]`);
    await expect(leak).toHaveCount(0);
  });

  test('idempotent createModelInStage: second click reopens the same model', async ({
    signedInPage: page,
    seededSession,
  }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);

    // First click: creates model.
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('start-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const firstUrl = page.url();

    // Go back to the session page — the card should now be Open (no
    // start-model-button rendered). Open it.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-individual_model')
      .getByTestId('open-model-individual_model')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    expect(page.url()).toBe(firstUrl);
  });

  test('unauthorised session URL returns 404', async ({ signedInPage: page }) => {
    // Random uuid the caller has never been granted access to.
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const res = await page.goto(`/app/sessions/${fakeId}`);
    expect(res?.status()).toBe(404);
  });
});
