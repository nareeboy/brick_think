import { expect, type Page } from '@playwright/test';

import { test } from './fixtures';

// The signedInPage fixture sets bt_canvas_tutorial_seen='1' to suppress the
// tutorial. This spec clears it on the first navigation only, so a fresh-user
// canvas open fires the tutorial naturally; later reloads keep whatever the
// user's interaction set (so a finished/skipped tour does not re-fire).
test.describe('canvas builder tutorial', () => {
  test.beforeEach(async ({ signedInPage }) => {
    await signedInPage.addInitScript(() => {
      const firstVisit = !window.sessionStorage.getItem('__bt_e2e_canvas_init');
      if (firstVisit) {
        window.sessionStorage.setItem('__bt_e2e_canvas_init', '1');
        window.localStorage.removeItem('bt_canvas_tutorial_seen');
      }
    });
  });

  async function openPersonalDesign(page: Page) {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
  }

  test('first canvas open shows the tutorial and Next steps to the end', async ({
    signedInPage: page,
  }) => {
    await openPersonalDesign(page);

    const tutorial = page.getByTestId('canvas-builder-tutorial');
    await expect(tutorial).toBeVisible();
    await expect(tutorial).toContainText('Step 1 of 6');

    // Step through with Next until "Got it" finishes it.
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('canvas-tutorial-next').click();
    }
    await page.getByTestId('canvas-tutorial-next').click(); // "Got it" on step 6

    await expect(tutorial).toBeHidden();

    // Flag persisted → reload does not re-fire.
    await page.reload();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await expect(page.getByTestId('canvas-builder-tutorial')).toBeHidden();
  });

  test('Skip tour dismisses it and persists', async ({ signedInPage: page }) => {
    await openPersonalDesign(page);

    const tutorial = page.getByTestId('canvas-builder-tutorial');
    await expect(tutorial).toBeVisible();

    await page.getByTestId('canvas-tutorial-skip').click();
    await expect(tutorial).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('builder-canvas')).toBeVisible();
    await expect(page.getByTestId('canvas-builder-tutorial')).toBeHidden();
  });
});
