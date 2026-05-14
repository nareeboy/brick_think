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
  seededSession: {
    sessionId: string;
    orgId: string;
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
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return `e2e-${suffix}@brick-think.test`;
}

export const test = base.extend<Fixtures>({
  signedInEmail: async ({}, use) => {
    await use(makeTestEmail());
  },
  signedInPage: async ({ page, signedInEmail }, use) => {
    const res = await page.request.post('/api/test/sign-in', {
      data: { email: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(
        `Test sign-in failed (${res.status()}): ${await res.text()}`,
      );
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
  seededSession: async ({ signedInPage, signedInEmail }, use) => {
    const res = await signedInPage.request.post('/api/test/seed-session', {
      data: { callerEmail: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(
        `Seed session failed (${res.status()}): ${await res.text()}`,
      );
    }
    const body = (await res.json()) as Fixtures['seededSession'];
    await use(body);
  },
});

export { expect };
