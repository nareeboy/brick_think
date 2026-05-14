import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': resolve(root),
    },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'happy-dom']],
    globals: false,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      'node_modules/**',
      '.next/**',
      '.claude/**',
      'dist/**',
      'coverage/**',
      'e2e/**',
      // Integration tests have their own config + script (pnpm test:integration).
      // They hit the local Supabase stack and are not part of `pnpm test`.
      'tests/integration/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/*.config.{ts,mjs,js}', '.next/**', 'coverage/**'],
    },
  },
});
