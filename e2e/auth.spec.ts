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
    // The join page lives at /app/join/[code] (bare /join/<code> 404s) —
    // same stale-URL rot participant-join.spec carried; see that spec's note.
    // Public reachability contract: the code lookup runs BEFORE the auth
    // gate, so an unauthenticated visit with a bogus code renders the
    // branded code_not_found copy (naming the code) instead of bouncing to
    // /sign-in or 404ing.
    await page.goto('/app/join/SAMPLE-CODE');
    await expect(
      page.getByRole('heading', { name: /we couldn't find that session/i }),
    ).toBeVisible();
    await expect(page.getByText(/"SAMPLE-CODE"/)).toBeVisible();
  });
});
