import { expect, test } from '@playwright/test';

test.describe('workshops surface', () => {
  test('/app/workshops redirects to sign-in when unauthenticated', async ({ page }) => {
    const response = await page.goto('/app/workshops');
    await expect(page).toHaveURL(/\/sign-in/);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /sign in/i, level: 1 })).toBeVisible();
  });

  test('/app/workshops/new redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/app/workshops/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
