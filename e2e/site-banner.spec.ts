// e2e/site-banner.spec.ts
//
// Admin banner → site-wide visibility → dismissal flow.
//   1. A site admin activates a banner at /app/admin/banner.
//   2. It appears at the top of a marketing page and an authed page.
//   3. Dismissing it persists across reload.
//   4. Editing the message (version bump) re-shows it.
//
// Selectors cross-checked against:
//   app/(authed)/app/admin/banner/BannerSettingsForm.tsx
//   components/banner/SiteBannerClient.tsx (id="site-banner", aria-label="Dismiss notification")

import { expect, test } from './fixtures';

const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

test.beforeEach(async ({ siteAdminPage: page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'bt.consent.v1',
      JSON.stringify({ v: 1, decidedAt: new Date().toISOString(), analytics: false }),
    );
  });
});

test('admin activates a banner; it shows site-wide, dismisses, and re-shows on edit', async ({
  siteAdminPage: page,
}) => {
  const message = `Scheduled maintenance ${RUN_ID}`;

  // Activate via the admin editor.
  await page.goto('/app/admin/banner');
  await page.getByRole('switch', { name: /banner active/i }).click();
  await page.getByLabel('Banner Type').selectOption('warning');
  await page.getByLabel('Message').fill(message);
  await page.getByRole('button', { name: /save banner/i }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // Visible on an authed page.
  await page.goto('/app/my-designs');
  await expect(page.locator('#site-banner')).toContainText(message);

  // Visible on a marketing page.
  await page.goto('/');
  await expect(page.locator('#site-banner')).toContainText(message);

  // Dismiss, then reload → stays hidden.
  await page.locator('#site-banner').getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(page.locator('#site-banner')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#site-banner')).toHaveCount(0);

  // Edit the message → version bumps → banner re-appears after reload.
  const message2 = `${message} (updated)`;
  await page.goto('/app/admin/banner');
  await page.getByLabel('Message').fill(message2);
  await page.getByRole('button', { name: /save banner/i }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('#site-banner')).toContainText(message2);

  // Cleanup: deactivate so the global row doesn't leak into other specs.
  await page.goto('/app/admin/banner');
  await page.getByRole('switch', { name: /banner active/i }).click();
  await page.getByRole('button', { name: /save banner/i }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
});
