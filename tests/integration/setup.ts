// Node 20/21 lack native `globalThis.WebSocket`. Supabase JS's RealtimeClient
// constructs eagerly when createClient() runs and throws without one. The
// `ws` package is already a project dep (yjs worker), so polyfill it here.
//
// Vitest's main config loads happy-dom for *.test.tsx, which brings its own
// WebSocket — but integration tests run under the plain `node` environment
// where there is none. Setting globalThis.WebSocket once at setup time is
// enough; no per-test wiring needed.

import WebSocket from 'ws';

// `ws`'s WebSocket lacks the DOM `dispatchEvent` method so it doesn't
// satisfy the lib.dom WebSocket constructor type structurally. The polyfill
// is for the supabase-js RealtimeClient, which only uses the constructor +
// `send`/`close`/event handlers — all present. Bypass the structural check.
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}
