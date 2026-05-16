# Integration tests — Vitest against local Supabase

`pnpm test:integration` runs the suite under this directory against the local Supabase stack (`pnpm db:start`). Configured separately from the unit suite — different config ([../../vitest.integration.config.ts](../../vitest.integration.config.ts)) and env loaded from `.env.test` via `dotenv-cli`. The default `pnpm test` excludes `tests/integration/**` so unit runs stay stack-independent.

Each test creates disposable users (`@brick-think.test`) + org + session via the [../../lib/testing/supabase-test-client.ts](../../lib/testing/supabase-test-client.ts) factory and cleans up in `afterAll` (sessions → orgs → model_versions → `admin.deleteUser`, mirroring the same NO-ACTION FK dance as `/api/test/delete-user`). No `pnpm db:reset` between tests; isolation comes from randomised emails and per-file cleanup.

Node 21 / 22 lacks native `globalThis.WebSocket`, which supabase-js's RealtimeClient hits at `createClient()`. [setup.ts](setup.ts) polyfills it from the already-installed `ws` package.

This harness is the answer to the stream #2 deferred-tests punch list. When new RLS surface lands (e.g. Yjs collab), write the new invariants alongside the existing ones rather than spinning up parallel infrastructure.
