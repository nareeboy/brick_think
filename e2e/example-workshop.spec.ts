// The example-workshop journey: a brand-new user with no workshops opens a
// finished one to see what a workshop looks like, and gets exactly one.
//
// Covered at unit/integration level too (ExampleWorkshopButton.test.tsx,
// example-workshop-seeder.integration.test.ts); this spec is the wiring
// check those cannot make — server page → client button → server action →
// redirect — plus the one-per-user rule as the user actually experiences it.

import { test, expect } from './fixtures';

const SESSION_URL = /\/app\/sessions\/[0-9a-f-]{36}$/;

test('a new user can open an example workshop from the empty state', async ({ signedInPage }) => {
  const page = signedInPage;
  await page.goto('/app/workshops');

  // Empty list: the empty state carries the only example CTA on the page.
  await expect(page.getByTestId('example-workshop-button')).toHaveCount(1);
  const cta = page.getByTestId('example-workshop-button');
  await expect(cta).toHaveText('See an example workshop');

  await cta.click();
  await page.waitForURL(SESSION_URL, { timeout: 60_000 });
  const seededUrl = page.url();

  // The seeded session is a finished workshop, not an empty shell. (The h1
  // wraps the rename control, so its accessible name is "Rename session" —
  // assert on the title's own testid instead.)
  await expect(page.getByTestId('session-title').first()).toHaveText(
    'Example workshop — How we collaborate',
  );
  await expect(page.getByText('5 stages · 5 done')).toBeVisible();
  for (const name of ['Aisha Rahman', 'Jonas Weber', 'Priya Nair']) {
    await expect(page.getByText(name).first()).toBeVisible();
  }

  // Back on the list it is badged as an example and the CTA flips to reopening.
  await page.goto('/app/workshops');
  // The pill is uppercased in CSS; the DOM text is "Example".
  await expect(page.getByText('Example', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('example-workshop-button')).toHaveText('Open example workshop');

  // A second click reopens the same workshop rather than seeding another.
  await page.getByTestId('example-workshop-button').click();
  await page.waitForURL(SESSION_URL, { timeout: 60_000 });
  expect(page.url()).toBe(seededUrl);

  await page.goto('/app/workshops');
  await expect(page.locator('li[data-scroll-target]')).toHaveCount(1);

  // My designs lists the four room models the user owns. Nothing ever opens
  // these canvases in the builder, so the seeder is the only thing that can
  // give them a thumbnail — without one every card falls back to the empty
  // dot-grid placeholder.
  await page.goto('/app/my-designs');
  const thumbs = page.getByTestId('design-thumb');
  await expect(thumbs).toHaveCount(4);
  const images = thumbs.locator('img');
  await expect(images).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    const img = images.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('src', /model-thumbnails/);
    // A real, decoded image — an empty or 404 src leaves naturalWidth at 0.
    await expect
      .poll(async () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
  }
});
