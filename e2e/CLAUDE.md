# E2E — Playwright against local Supabase

Scope: Playwright specs in this directory and the wrapper scripts that drive them. Supabase-stack gotchas that bite both E2E and `pnpm dev:e2e` (Kong stale upstream, PKCE host pinning) live in [../supabase/CLAUDE.md](../supabase/CLAUDE.md).

## E2E env — local Supabase, not remote

E2E exercises the **local** Supabase stack (`pnpm db:start`), not the remote project. `pnpm build:e2e` and `pnpm start:e2e` wrap `next build` / `next start` with `dotenv-cli` to load [../.env.test](../.env.test) instead of `.env.local`. `.env.test` is committed and contains the well-known Supabase CLI demo JWTs — public knowledge, only valid against `http://127.0.0.1:54321`. [../playwright.config.ts](../playwright.config.ts) `webServer.command` is `pnpm start:e2e`.

This is the second half of the "never push WIP migrations to remote" fix: never push a migration to remote just to make E2E pass. New migrations must apply cleanly via `pnpm db:reset` (against the local stack) before E2E.

For interactive local-Supabase development (manually testing UI changes against the local stack with Mailpit for magic-link emails, no rate limits), `pnpm dev:e2e` is the symmetric wrapper around `next dev`. Use this instead of `pnpm dev` when you want sign-up to land in Mailpit at `http://127.0.0.1:54324` rather than going through the remote project's email service.

## Playwright auth fixture

`signedInPage` mints a Supabase session by posting to the dev-only [/api/test/sign-in](../app/api/test/sign-in/route.ts) route. The route has three independent gates, all required: `E2E_AUTH_ENABLED=1` (set in [../playwright.config.ts](../playwright.config.ts) webServer env), a `localhost`/`127.0.0.1` host check, and an `@brick-think.test` email pattern. **Never set `E2E_AUTH_ENABLED` on Railway.** Read the comment at the top of the route file before adding, removing, or weakening any gate — `NODE_ENV` was deliberately *not* used as a gate (see the comment for why).

The fixture also runs an `addInitScript` that pre-sets the [first-login walkthrough](../components/onboarding/) flags (`bt_welcome_seen`, `bt_checklist_dismissed`, `bt_session_tour_seen`) to `'1'` before any navigation. Without this, every test would start with a fresh user → no flags → the welcome modal / spotlight tour overlays would intercept the first interaction on `/app/my-designs` or `/app/sessions/[id]`. Onboarding-specific tests in [onboarding-walkthrough.spec.ts](onboarding-walkthrough.spec.ts) override this in a `beforeEach` by registering a second `addInitScript` that clears the same keys (Playwright runs init scripts in registration order, so later wins). If you add a new test fixture that opens authed pages with onboarding state intact, mirror the override pattern there.

## E2E workflow gotchas

- **Don't run `pnpm dev` concurrently with `pnpm test:e2e`.** Playwright will reuse the dev server on port 3000 — silently skipping `webServer.env` so `E2E_AUTH_ENABLED` is missing and the sign-in route 404s. `next dev` also writes into `.next/` and corrupts the production build between runs.
- If you need both running, use `PORT=3100 pnpm test:e2e`. Re-run `pnpm build:e2e` if you see "Could not find a production build in the '.next' directory".
- The fixture creates one `e2e-<rand>@brick-think.test` auth user per test and deletes it in fixture teardown via [/api/test/delete-user](../app/api/test/delete-user/route.ts), so `auth.users` no longer accumulates. If a teardown ever fails (logged as `[e2e] cleanup failed …`), the fallback sweep is `delete from auth.users where email like 'e2e-%@brick-think.test'`. The delete route uses the same three-gate defence as `/api/test/sign-in` plus a hard refusal to touch any user whose email isn't in the test domain.

## Playwright session-seed fixture

`seededSession` (in [fixtures.ts](fixtures.ts)) creates a fresh session and its five stages per test via the dev-only [/api/test/seed-session](../app/api/test/seed-session/route.ts) route. The route has three independent gates, all required: `E2E_SESSIONS_ENABLED=1` (set in [../playwright.config.ts](../playwright.config.ts) `webServer.env`), a `localhost`/`127.0.0.1` host check, and the same `@brick-think.test` email allowlist on `callerEmail`. **Never set `E2E_SESSIONS_ENABLED` on Railway.** Same defence-in-depth pattern as `/api/test/sign-in`; read the comment at the top of the route file before adding, removing, or weakening any gate.

The fixture requires the caller to have signed in once first via `/api/test/sign-in` (the seed route looks up the profile row by email). It bootstraps an org + owner membership for a brand-new test user if they have no `org_memberships` row; otherwise it reuses their first existing org. The created session is owned by the caller as facilitator. The owner membership is inserted automatically by the `handle_new_organisation` DB trigger; the route only inserts the org row. The response includes both `sessionId` and `orgId` so Playwright fixtures can drive the new wizard / send-to-session flows without re-querying.

Manual dev curl after `E2E_AUTH_ENABLED=1 E2E_SESSIONS_ENABLED=1 pnpm dev`:

```bash
curl -X POST http://localhost:3000/api/test/sign-in \
  -H 'content-type: application/json' \
  -d '{"email":"e2e-dev@brick-think.test"}'

curl -X POST http://localhost:3000/api/test/seed-session \
  -H 'content-type: application/json' \
  -d '{"callerEmail":"e2e-dev@brick-think.test"}'
```

The returned `sessionId` plugs straight into `/app/sessions/<id>` in the browser.

Sessions and stages accumulate over time alongside the test auth users. Clean periodically via SQL: `delete from public.sessions where title like 'Test session%';` (cascades to stages, models, and any future child rows).
