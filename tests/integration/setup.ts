// Node 20/21 lack native `globalThis.WebSocket`. Supabase JS's RealtimeClient
// constructs eagerly when createClient() runs and throws without one. The
// `ws` package is already a project dep (yjs worker), so polyfill it here.
//
// Vitest's main config loads happy-dom for *.test.tsx, which brings its own
// WebSocket — but integration tests run under the plain `node` environment
// where there is none. Setting globalThis.WebSocket once at setup time is
// enough; no per-test wiring needed.

import { vi } from 'vitest';
import WebSocket from 'ws';

// `ws`'s WebSocket lacks the DOM `dispatchEvent` method so it doesn't
// satisfy the lib.dom WebSocket constructor type structurally. The polyfill
// is for the supabase-js RealtimeClient, which only uses the constructor +
// `send`/`close`/event handlers — all present. Bypass the structural check.
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

// Suite-wide server-action mocks (previously a copy-pasted preamble in 17
// files). Factories live in _helpers/action-mocks.ts; test files select the
// acting identity per test via setActionClient(). Registering vi.mock here
// applies it to every integration test file — files that never import these
// modules are unaffected.
vi.mock('next/cache', async () => (await import('./_helpers/action-mocks')).nextCacheMock());
vi.mock('next/navigation', async () =>
  (await import('./_helpers/action-mocks')).nextNavigationMock(),
);
vi.mock('next/headers', async () => (await import('./_helpers/action-mocks')).nextHeadersMock());
vi.mock('@/lib/db/server', async () => (await import('./_helpers/action-mocks')).dbServerMock());
