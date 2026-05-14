import { expect, test } from '@playwright/test';

test.describe('orgs surface', () => {
  test('/app/orgs redirects to sign-in when unauthenticated', async ({ page }) => {
    const response = await page.goto('/app/orgs');
    await expect(page).toHaveURL(/\/sign-in/);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /sign in/i, level: 1 })).toBeVisible();
  });

  test('/app/orgs/new redirects to sign-in when unauthenticated', async ({ page }) => {
    await page.goto('/app/orgs/new');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
