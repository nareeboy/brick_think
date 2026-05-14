import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

// Integration tests hit the local Supabase stack on http://127.0.0.1:54321.
// Run via `pnpm test:integration`, which loads `.env.test` via dotenv-cli so
// SUPABASE_URL + service-role JWT are available. The default `pnpm test`
// run (vitest.config.ts) excludes these by glob so the unit suite stays
// stack-independent.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': resolve(root) },
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['tests/integration/setup.ts'],
    include: ['tests/integration/**/*.integration.test.ts'],
    // One test file at a time. Tests share the local Supabase stack — running
    // files in parallel reduces isolation since they all see each other's
    // fixtures even with random emails. Cheap to serialise; each file is fast.
    fileParallelism: false,
    // Each integration test creates DB rows; give it longer than the unit
    // default in case the local stack is cold.
    testTimeout: 30_000,
  },
});
