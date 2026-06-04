// Playwright fixture functions use `({}, use) => …` and call `use(...)` to
// hand the value to the test. The fixture lint rules ('no-empty-pattern',
// 'react-hooks/rules-of-hooks') are React-oriented and misfire here; they
// don't apply to Playwright's worker fixture convention.
/* eslint-disable no-empty-pattern, react-hooks/rules-of-hooks */

import { test as base, expect, type Page } from '@playwright/test';

// A signed-in page fixture. Mints a fresh test user per test via the
// dev-only /api/test/sign-in route (see app/api/test/sign-in/route.ts) and
// hands back a page whose cookie jar carries the resulting Supabase session.
//
// The route requires the `E2E_AUTH_ENABLED=1` env var on the server it talks
// to; playwright.config.ts sets this in the webServer block.

interface Fixtures {
  signedInEmail: string;
  signedInPage: Page;
  // A signed-in page whose user has been promoted to site admin
  // (public.profiles.is_site_admin = true) via the dev-only
  // /api/test/promote-site-admin route. Gives access to the /app/admin/*
  // surface (changelog editor, careers inbox, etc.).
  siteAdminPage: Page;
  seededSession: {
    sessionId: string;
    orgId: string;
    joinCode: string;
    stageIds: Record<
      | 'skill_building'
      | 'individual_model'
      | 'shared_model'
      | 'system_model'
      | 'guiding_principles',
      string
    >;
  };
}

function makeTestEmail(): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${suffix}@brick-think.test`;
}

export const test = base.extend<Fixtures>({
  signedInEmail: async ({}, use) => {
    await use(makeTestEmail());
  },
  signedInPage: async ({ page, signedInEmail }, use) => {
    // Suppress the first-login walkthrough by default — every other spec
    // assumes a "returning user" UI without the welcome modal / spotlight
    // tour overlaying it. Onboarding-specific specs clear these in their
    // own beforeEach (which registers a second addInitScript that runs
    // after this one and selectively removes the flags).
    await page.addInitScript(() => {
      window.localStorage.setItem('bt_welcome_seen', '1');
      window.localStorage.setItem('bt_checklist_dismissed', '1');
      window.localStorage.setItem('bt_session_tour_seen', '1');
    });
    const res = await page.request.post('/api/test/sign-in', {
      data: { email: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Test sign-in failed (${res.status()}): ${await res.text()}`);
    }
    const signInBody = (await res.json()) as { userId?: string | null };
    const userId = signInBody.userId ?? null;
    try {
      await use(page);
    } finally {
      if (userId) {
        const cleanupRes = await page.request.post('/api/test/delete-user', {
          data: { userId },
        });
        if (!cleanupRes.ok()) {
          console.warn(
            `[e2e] cleanup failed for ${signedInEmail} (${userId}): ${cleanupRes.status()} ${await cleanupRes.text()}`,
          );
        }
      }
    }
  },
  siteAdminPage: async ({ signedInPage, signedInEmail }, use) => {
    // Reuse the already-signed-in page (and its fresh user + cleanup), then
    // flip is_site_admin on that user's profile. The route gates on the same
    // host + E2E_AUTH_ENABLED + test-email checks as the other test routes.
    const res = await signedInPage.request.post('/api/test/promote-site-admin', {
      data: { email: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Promote site admin failed (${res.status()}): ${await res.text()}`);
    }
    await use(signedInPage);
  },
  seededSession: async ({ signedInPage, signedInEmail }, use) => {
    const res = await signedInPage.request.post('/api/test/seed-session', {
      data: { callerEmail: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Seed session failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as Fixtures['seededSession'];
    await use(body);
  },
});

export { expect };
