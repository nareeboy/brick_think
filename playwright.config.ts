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
  // No retries anywhere: a failing test should fail loudly, on CI and locally.
  // Don't reintroduce retries to paper over a deterministic failure.
  retries: 0,
  // File-level parallelism (fullyParallel stays false, so a worker always takes
  // a whole spec file and within-file ordering assumptions still hold). Cross-
  // file isolation is real: every test mints its own @brick-think.test user and
  // seeds its own org/session, Mailpit is searched by `to:<addr>`, and
  // promote-site-admin flips one profile row — no spec asserts on a global
  // count. Measured on the CI runner, green every time: 236s at 1 worker, 195s
  // at 2, and 152s / 190s / 190s over three runs at 3 — the step swings ±25%
  // between runs, so 2 vs 3 is inside the noise and only 1 vs many is a real
  // difference. Three is the stopping point — the runner also carries the
  // Supabase containers, the Next server and the Yjs worker, and with
  // retries: 0 a contention flake is expensive. Locally (14 cores) the same
  // suite runs 144s / 87s / 54s at 1 / 2 / 4.
  workers: process.env.CI ? 3 : 4,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: [
    {
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
        E2E_AUTH_ENABLED: '1',
        E2E_SESSIONS_ENABLED: '1',
        // Premium overlay E2E: route the assistant's model calls to the
        // scripted stub. Inert in open core (the route 404s); never set on
        // Railway. Spec §9: the live API is never called in CI.
        ASSISTANT_MODEL_STUB: '1',
        NEXT_PUBLIC_YJS_COLLAB_ENABLED: '1',
        NEXT_PUBLIC_YJS_WS_URL: 'ws://localhost:1234/yjs',
        YJS_JWT_SECRET: 'a'.repeat(64),
      },
    },
    {
      // Yjs worker — same JWT secret as the web server above, points at the
      // local Supabase Postgres for snapshot persistence.
      command: 'pnpm exec tsx worker/src/yjs-server.ts',
      url: 'http://localhost:1234/healthz',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        YJS_PORT: '1234',
        YJS_JWT_SECRET: 'a'.repeat(64),
        WORKER_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        YJS_PERSIST_DEBOUNCE_MS: '500',
        YJS_PERSIST_CEILING_MS: '5000',
      },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
