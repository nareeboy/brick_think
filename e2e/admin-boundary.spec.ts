import { expect, test } from './fixtures';

// Open-core build: the admin panel is premium-only — even a site admin gets a
// 404 and no Admin nav link. The premium overlay replaces this spec with the
// overlay-mode assertions (panel visible to site admins).
test('admin panel is absent from the open-core build', async ({ siteAdminPage: page }) => {
  await page.goto('/app/my-designs');
  await expect(page.getByTestId('nav-admin')).toHaveCount(0);
  const res = await page.goto('/app/admin');
  expect(res?.status()).toBe(404);
});
