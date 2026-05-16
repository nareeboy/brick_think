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
        WORKER_DATABASE_URL:
          'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        YJS_PERSIST_DEBOUNCE_MS: '500',
        YJS_PERSIST_CEILING_MS: '5000',
      },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
