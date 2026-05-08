import { expect, test } from '@playwright/test';

test.describe('auth surface', () => {
  test('the sign-in page renders the magic-link form and Google button', async ({ page }) => {
    await page.goto('/sign-in');

    await expect(page.getByRole('heading', { name: /sign in/i, level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send sign-in link/i })).toBeVisible();
    await expect(page.getByTestId('google-sign-in')).toBeVisible();
  });

  test('protected /app redirects unauthenticated users to /sign-in', async ({ page }) => {
    const response = await page.goto('/app');
    await expect(page).toHaveURL(/\/sign-in/);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /sign in/i, level: 1 })).toBeVisible();
  });

  test('the join flow stays publicly reachable', async ({ page }) => {
    await page.goto('/join/SAMPLE-CODE');
    await expect(page.getByRole('heading', { name: /join a session/i })).toBeVisible();
    await expect(page.getByText('SAMPLE-CODE')).toBeVisible();
  });
});
