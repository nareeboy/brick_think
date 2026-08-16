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
      'server-only': resolve(root, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'happy-dom']],
    globals: false,
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.mjs'],
    exclude: [
      'node_modules/**',
      '.next/**',
      '.claude/**',
      '.worktrees/**',
      'dist/**',
      'coverage/**',
      'e2e/**',
      // Integration tests have their own config + script (pnpm test:integration).
      // They hit the local Supabase stack and are not part of `pnpm test`.
      'tests/integration/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      exclude: ['**/*.config.{ts,mjs,js}', '.next/**', 'coverage/**'],
      // Ratchet floor — set from the CI (Node 20) baseline of 2026-08-16:
      // 19.8% stmts / 83.97% branch / 76.42% funcs on 765 unit tests, rounded
      // down so unrelated churn can't red-fail CI. NB: v8 coverage numbers
      // drift across Node versions (local Node 21 measures ~85% branch /
      // ~80% funcs on the same suite) — CI is the enforcement environment, so
      // the floor tracks CI's numbers. Raise as coverage grows, never lower.
      thresholds: {
        statements: 19,
        branches: 83,
        functions: 76,
        lines: 19,
      },
    },
  },
});
