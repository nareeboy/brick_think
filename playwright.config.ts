import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/canvas-bench.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    // start:e2e loads .env.test, which points NEXT_PUBLIC_SUPABASE_URL at the
    // local stack (http://127.0.0.1:54321) instead of the remote project.
    // Run `pnpm build:e2e` (also dotenv-wrapped) before `pnpm test:e2e` so the
    // client bundle is baked against local Supabase too — see CLAUDE.md.
    command: 'pnpm start:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Unlocks /api/test/sign-in so the signed-in fixture in e2e/fixtures.ts
      // can mint a Supabase session without going through magic-link email.
      // See the route file for the rest of the defence-in-depth.
      E2E_AUTH_ENABLED: '1',
      // Unlocks /api/test/seed-session so the seededSession fixture can
      // create a session + stages per test. Same three-gate model.
      E2E_SESSIONS_ENABLED: '1',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
