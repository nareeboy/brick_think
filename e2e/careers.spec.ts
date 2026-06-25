// e2e/careers.spec.ts
//
// Public careers application flow.
//
// What this covers:
//   1. /careers lists an open role seeded via the test API.
//   2. Clicking the role opens /careers/[slug] with the application form.
//   3. Filling the form end-to-end (first/last name, address, contact number,
//      LinkedIn URL, CV upload, terms checkbox) and submitting results in the
//      "Application received" success panel.
//
// What is NOT covered here:
//   Admin inbox at /app/admin/careers/applications — skipped because the
//   harness provides no site-admin sign-in fixture. The /api/test/sign-in
//   route creates a fresh test user but does not promote it to site-admin
//   (is_site_admin = true in public.profiles). Adding admin-download coverage
//   requires either a dedicated seed-site-admin test route or a separate
//   fixture that mirrors the existing seed-session pattern.
//
// Selectors are cross-checked against:
//   components/careers/ApplicationForm.tsx
//   components/careers/PhoneInput.tsx
//   app/careers/page.tsx
//   app/careers/[slug]/page.tsx

import path from 'path';
import { fileURLToPath } from 'url';

import { expect, test } from '@playwright/test';

// The slug must match TEST_SLUG_PATTERN in the seed route (^e2e-[a-z0-9-]+$).
const ROLE_SLUG = `e2e-engineer-${Date.now()}`;
const ROLE_TITLE = 'E2E Test Engineer';
const SEED_URL = '/api/test/seed-careers-role';

// `__dirname` is undefined in ESM (repo is "type": "module"); derive it from the
// module URL — same pattern as account-avatar.spec.ts.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CV_FIXTURE = path.join(__dirname, 'fixtures', 'sample-cv.pdf');

test.describe('careers public application flow', () => {
  // Seed an open role before all tests in this describe block and tear it
  // down after. We use a bare `request` fixture (no auth cookie) because the
  // /api/test routes gate on the host header + E2E_AUTH_ENABLED — not on any
  // session cookie.
  test.beforeAll(async ({ request }) => {
    const res = await request.post(SEED_URL, {
      data: {
        slug: ROLE_SLUG,
        title: ROLE_TITLE,
        location: 'Remote',
        employmentType: 'Full-time',
        summary: 'Build and maintain the Playwright E2E test suite.',
      },
    });
    if (!res.ok()) {
      throw new Error(`Failed to seed careers role (${res.status()}): ${await res.text()}`);
    }
  });

  test.afterAll(async ({ request }) => {
    await request.delete(SEED_URL, { data: { slug: ROLE_SLUG } });
  });

  test('/careers lists the seeded open role', async ({ page }) => {
    await page.goto('/careers');
    await expect(page.getByRole('heading', { level: 2, name: ROLE_TITLE })).toBeVisible();
  });

  test('clicking the role card navigates to /careers/[slug]', async ({ page }) => {
    await page.goto('/careers');
    await page.getByRole('heading', { level: 2, name: ROLE_TITLE }).click();
    await page.waitForURL(`/careers/${ROLE_SLUG}`);
    // The detail page h1 matches the role title.
    await expect(page.getByRole('heading', { level: 1, name: ROLE_TITLE })).toBeVisible();
    // The application form section heading is visible.
    await expect(page.getByRole('heading', { level: 2, name: 'Apply' })).toBeVisible();
  });

  test('submitting a complete application shows the success panel', async ({ page }) => {
    await page.goto(`/careers/${ROLE_SLUG}`);

    // Wait for the form to be present before interacting.
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();

    // --- First name ---
    await page.getByLabel('First name').fill('Alice');

    // --- Last name ---
    await page.getByLabel('Last name').fill('Testington');

    // --- Email ---
    await page.getByLabel('Email').fill('alice.testington@example.com');

    // --- Address ---
    await page.getByLabel('Address').fill('1 Test Street, Testville, TS1 1AB');

    // --- Contact number (PhoneInput) ---
    // The label "Contact number" is on the tel <input> (the numberId).
    // We target the visible tel input by its label.
    await page.getByLabel('Contact number').fill('7700 900123');

    // --- LinkedIn profile ---
    await page.getByLabel('LinkedIn profile').fill('https://www.linkedin.com/in/alice-testington');

    // --- Upload CV ---
    // The file input has label "Upload CV (PDF, DOC, or DOCX · max 5 MB)".
    // Playwright's setInputFiles works on the <input type="file"> directly.
    const cvInput = page.getByLabel(/Upload CV/i);
    await cvInput.setInputFiles(CV_FIXTURE);

    // --- Terms and conditions checkbox ---
    // The checkbox is inside a <label> that contains "terms and conditions".
    // We target the checkbox input inside that label.
    await page.getByRole('checkbox').check();

    // --- Submit ---
    await page.getByRole('button', { name: 'Submit application' }).click();

    // On success the form is replaced by a panel with "Application received".
    await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible({
      timeout: 15_000,
    });

    // The panel also mentions the role title.
    await expect(page.getByText(ROLE_TITLE)).toBeVisible();
  });

  test('submitting without a CV shows the cv_missing error', async ({ page }) => {
    await page.goto(`/careers/${ROLE_SLUG}`);
    await expect(page.getByRole('button', { name: 'Submit application' })).toBeVisible();

    await page.getByLabel('First name').fill('Bob');
    await page.getByLabel('Last name').fill('Nofile');
    await page.getByLabel('Email').fill('bob.nofile@example.com');
    await page.getByLabel('Address').fill('2 Missing File Lane');
    await page.getByLabel('Contact number').fill('7700 900456');
    await page.getByLabel('LinkedIn profile').fill('https://www.linkedin.com/in/bob-nofile');
    // Deliberately skip the file input.
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Submit application' }).click();

    // The API returns code=cv_missing which maps to the error message below.
    await expect(page.getByRole('alert')).toContainText('Please attach your CV', {
      timeout: 10_000,
    });
  });
});
