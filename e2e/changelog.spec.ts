// e2e/changelog.spec.ts
//
// Changelog admin → public visibility flow.
//
// What this covers:
//   1. A site admin creates a changelog entry at /app/admin/changelog/new,
//      publishes it, and it then appears on the public /changelog page; the
//      marketing footer surfaces the entry's version tag as a link.
//   2. A draft entry (created but never published) does NOT appear on the
//      public /changelog page.
//
// Admin auth mechanism:
//   The `siteAdminPage` fixture (e2e/fixtures.ts) builds on `signedInPage` —
//   a fresh per-test @brick-think.test user — and flips is_site_admin via the
//   dev-only /api/test/promote-site-admin route. The /app/admin layout
//   redirects non-admins away, so this promotion is what gates page access.
//
// Selectors are cross-checked against:
//   app/(authed)/app/admin/changelog/ChangelogEditor.tsx
//   app/(authed)/app/admin/changelog/PublishToggleButton.tsx
//   app/(authed)/app/admin/changelog/ChangelogStatusPill.tsx
//   app/changelog/page.tsx
//   components/marketing/MarketingChrome.tsx (footer version link)

import { expect, test } from './fixtures';

// Unique per run — the e2e harness does not clean up changelog rows (the
// per-test user is deleted, but its authored entries are not necessarily), so
// avoid title collisions across reruns.
const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Pre-decide cookie consent so the bottom-anchored consent dialog
// (bt.consent.v1, see lib/consent/state.ts) doesn't intercept clicks on the
// editor / footer. Mirrors the ConsentDecision shape; v must equal
// CONSENT_VERSION (1) or the banner treats it as "not decided" and re-prompts.
test.beforeEach(async ({ siteAdminPage: page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'bt.consent.v1',
      JSON.stringify({ v: 1, decidedAt: new Date().toISOString(), analytics: false }),
    );
  });
});

test('admin can publish a changelog entry and it appears publicly with footer version', async ({
  siteAdminPage: page,
}) => {
  const title = `Voice narration ${RUN_ID}`;
  const body = `Facilitators can now record narration. ${RUN_ID}`;
  const version = `v2.4-${RUN_ID}`;

  await page.goto('/app/admin/changelog/new');

  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Category').selectOption('feature');
  await page.getByLabel(/Version tag/).fill(version);

  // Tiptap rich-text editor — the editable region carries the `article-prose`
  // class (RichTextEditor.tsx). Click to focus, then type.
  await page.locator('.article-prose').click();
  await page.keyboard.type(body);

  await page.getByRole('button', { name: 'Create entry' }).click();

  // create redirects to the edit page (/app/admin/changelog/[id]).
  await page.waitForURL(/\/app\/admin\/changelog\/[0-9a-f-]+$/);

  await page.getByRole('button', { name: 'Publish' }).click();
  // After publishing, the status pill flips to "Published".
  await expect(page.getByText('Published')).toBeVisible();

  await page.goto('/changelog');
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('link', { name: version })).toBeVisible();
});

test('a draft entry does not appear on the public page', async ({ siteAdminPage: page }) => {
  const title = `Unreleased secret ${RUN_ID}`;

  await page.goto('/app/admin/changelog/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Category').selectOption('fix');
  await page.getByRole('button', { name: 'Create entry' }).click();

  // The entry was created but never published — it must stay off /changelog.
  await page.waitForURL(/\/app\/admin\/changelog\/[0-9a-f-]+$/);

  await page.goto('/changelog');
  await expect(page.getByText(title)).toHaveCount(0);
});
