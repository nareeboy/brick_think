# BrickThink

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A virtual way to allow your teams to remotely conduct Serious Play. The hosted instance lives at [https://www.brickthink.io](https://www.brickthink.io).

Stack: Next.js 15 App Router, React 19, Supabase (Postgres + Auth + Storage + RLS), TypeScript, pnpm.

> **Status:** active development. `main` is the working branch and breaking changes are expected before a 1.0 release.

- Contributing — see [CONTRIBUTING.md](CONTRIBUTING.md)
- Code of conduct — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Security disclosures — [SECURITY.md](SECURITY.md)

## Quick reference

### URLs

| What                        | URL                                                                  | Notes                                                                           |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Dev server (default)        | `http://localhost:3000`                                              | `pnpm dev` — talks to **remote** Supabase                                       |
| Dev server (local Supabase) | `http://localhost:3000`                                              | `pnpm dev:e2e` — talks to **local** Supabase via `.env.test`                    |
| Local Supabase API          | `http://127.0.0.1:54321`                                             | Started by `pnpm db:start`                                                      |
| Local Supabase DB           | `postgresql://postgres:postgres@127.0.0.1:54322/postgres`            | direct psql / docker exec                                                       |
| Local Supabase Studio       | `http://127.0.0.1:54323`                                             | SQL editor, table editor, auth users                                            |
| Local Mailpit               | `http://127.0.0.1:54324`                                             | Catches magic-link emails sent by local stack                                   |
| Remote Supabase project     | `https://<your-supabase-project-ref>.supabase.co`                    | Configured in `.env.local` (`SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`) |
| Remote Supabase Dashboard   | `https://supabase.com/dashboard/project/<your-supabase-project-ref>` | SQL editor, logs, settings                                                      |

### Daily commands

```bash
# Dev
pnpm dev                # localhost:3000 → remote Supabase (default)
pnpm dev:e2e            # localhost:3000 → LOCAL Supabase (Mailpit, no rate limits)

# Quality
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm lint:fix           # auto-fix
pnpm format             # prettier --write
pnpm test               # vitest unit tests
pnpm test:watch         # vitest in watch mode

# Build / production
pnpm build              # next build, against remote Supabase env
pnpm build:e2e          # next build, against local Supabase env (.env.test)
pnpm start              # next start, against remote
pnpm start:e2e          # next start, against local
```

### Database commands

```bash
pnpm db:start           # boot local Supabase (Docker) — first time may pull images
pnpm db:stop            # stop local Supabase containers
pnpm db:status          # API URL, anon key, service-role key, all service URLs
pnpm db:reset           # wipe local DB + reapply all migrations + run seed.sql
pnpm db:diff            # diff local schema vs migrations (useful when authoring a migration)
pnpm db:types           # regenerate lib/db/types.generated.ts from local schema

# Remote (require explicit user authorisation per project policy):
pnpm db:link            # link CLI to the remote project (one-off)
pnpm db:migrations      # list which migrations are applied locally vs remote
pnpm db:push            # apply pending local migrations to remote — ASK FIRST
```

### Test environment flags

| Flag                            | Purpose                                                                               | Where it's set                       |
| ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| `E2E_AUTH_ENABLED=1`            | Unlocks `/api/test/sign-in` (mints a Supabase session for `@brick-think.test` emails) | `playwright.config.ts` webServer.env |
| `E2E_SESSIONS_ENABLED=1`        | Unlocks `/api/test/seed-session` (creates a session + 5 stages for the caller)        | `playwright.config.ts` webServer.env |
| **Never set either on Railway** | These are dev-only gates                                                              | —                                    |

Both routes also require a localhost host header AND a `@brick-think.test` email pattern — three independent gates per route.

## Requirements

- Node 20.10+
- pnpm 10+
- Docker for Desktop (OrbStack works) — for the local Supabase stack
- Optional: Supabase CLI (project ships its own via `pnpm exec supabase`)

## First-time setup

```bash
pnpm install
cp .env.example .env.local
# fill .env.local — see comments inside the file
# the critical ones are NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ACCESS_TOKEN (for pnpm db:push)

pnpm db:start                     # boots local Supabase via Docker
pnpm db:status                    # confirms all services up; copy keys if needed

# optional: link the CLI to the remote project (one-off, so pnpm db:push works)
pnpm db:link

pnpm dev                          # http://localhost:3000
```

## Auth and local user testing

The sign-in page supports magic link and Google OAuth.

**Against remote Supabase** (`pnpm dev`): magic links go through Supabase's hosted email service (rate-limited at ~4/hr per address). Google OAuth requires the email to be on the OAuth consent test-users list (the app is in Google's "Testing" mode).

**Against local Supabase** (`pnpm dev:e2e`): magic links land in Mailpit at `http://127.0.0.1:54324`. No rate limits. Google OAuth isn't configured locally (only magic link works).

### Multi-user testing (Alice + Bob locally)

1. Run `pnpm db:start` then `pnpm dev:e2e`.
2. Open `http://localhost:3000` in a regular window. Sign in as Alice via magic link → click the link in Mailpit.
3. Create an org via the Organisations page.
4. Open Mailpit (`http://127.0.0.1:54324`).
5. Open an **incognito window**, sign in as Bob (any email — Mailpit catches everything).
6. Back in Alice's window, go to Organisations → her org → add Bob by email as `member`.
7. Bob can now see Alice's org-shared designs and any sessions in her org.

### Useful SQL snippets

Seed a session for a known user (run in local Studio → SQL editor):

```sql
WITH me AS (
  SELECT p.id AS profile_id, m.org_id
  FROM public.profiles p
  JOIN public.org_memberships m ON m.profile_id = p.id
  WHERE p.email = 'you@example.com'   -- substitute your email
  LIMIT 1
),
new_session AS (
  INSERT INTO public.sessions (org_id, facilitator_id, title)
  SELECT org_id, profile_id, 'Manual test session'
  FROM me
  RETURNING id
)
INSERT INTO public.stages (session_id, stage_type, position)
SELECT new_session.id, st.stage_type, st.pos
FROM new_session
CROSS JOIN (VALUES
  ('skill_building'::public.stage_type,     0),
  ('individual_model'::public.stage_type,   1),
  ('shared_model'::public.stage_type,       2),
  ('system_model'::public.stage_type,       3),
  ('guiding_principles'::public.stage_type, 4)
) AS st(stage_type, pos);

SELECT 'http://localhost:3000/app/sessions/' || id AS visit_url
FROM public.sessions ORDER BY created_at DESC LIMIT 1;
```

Cleanup test rows after manual testing:

```sql
-- Local Supabase auth.users + cascaded profiles
DELETE FROM auth.users WHERE email LIKE 'e2e-%@brick-think.test';
DELETE FROM auth.users WHERE email LIKE 'bob%@example.com';

-- Test sessions (cascades to stages → models)
DELETE FROM public.sessions WHERE title LIKE 'Test session%' OR title LIKE 'Manual%';
```

## E2E testing

E2E runs against the **local** Supabase stack via `.env.test` (committed, contains public Supabase CLI demo JWTs).

```bash
pnpm db:start          # local Supabase must be running
pnpm build:e2e         # production build with local-Supabase env
pnpm test:e2e          # runs all Playwright specs (headless)
pnpm test:e2e --ui     # interactive mode (good for debugging a specific test)
pnpm test:e2e --headed # opens a real browser so you can watch
```

If port 3000 is in use by another dev server, override Playwright's port:

```bash
PORT=3200 pnpm test:e2e
```

Test fixtures live in [e2e/fixtures.ts](e2e/fixtures.ts):

- `signedInPage` — mints a Supabase session for a fresh `e2e-<rand>@brick-think.test` user via `/api/test/sign-in`.
- `seededSession` — creates a fresh session + 5 stages for the signed-in user via `/api/test/seed-session`.

Each test user is auto-deleted in fixture teardown via `/api/test/delete-user`.

## Manual dev curl (against `pnpm dev:e2e`)

Mint a test user + seed a session via the dev-only API routes:

```bash
curl -X POST http://localhost:3000/api/test/sign-in \
  -H 'content-type: application/json' \
  -d '{"email":"e2e-dev@brick-think.test"}'

curl -X POST http://localhost:3000/api/test/seed-session \
  -H 'content-type: application/json' \
  -d '{"callerEmail":"e2e-dev@brick-think.test"}'
```

The seed response contains a `sessionId` → open `http://localhost:3000/app/sessions/<id>` in the browser.

## Worker (Yjs collab backend)

Drives real-time collaboration on every room-backed canvas (`shared_model`, plus `system_model` / `guiding_principles` when the facilitator has created rooms): brick/group propagation, presence cursors with avatars + names, and per-client `Cmd+Z` / `Cmd+Shift+Z` undo. Personal stages (`individual_model`, `skill_building`) and any non-room canvas still use the autosave path; the worker is only consulted in live mode. Auth via 60s HS256 JWT from `/api/yjs/token`, verified worker-side before WS upgrade — room canvases additionally pass `can_edit_room` for transitive membership.

Required env (web and worker share `YJS_JWT_SECRET`):

- `NEXT_PUBLIC_YJS_COLLAB_ENABLED=1` — bakes the binding into the client bundle at build time.
- `NEXT_PUBLIC_YJS_WS_URL` — `ws://localhost:1234/yjs` in dev, `wss://<host>/yjs` in prod.
- `YJS_JWT_SECRET` — `openssl rand -hex 32`, identical on web and worker.
- `WORKER_DATABASE_URL` — local Postgres in dev (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), Supabase Session Pooler URI (port 5432) in prod. See [CLAUDE.md](CLAUDE.md) for the local-vs-remote toggle convention.

```bash
pnpm worker:dev        # tsx watch worker/src/yjs-server.ts
pnpm worker:start      # tsx worker/src/yjs-server.ts (production)
```

See [CLAUDE.md](CLAUDE.md) for stage + permission semantics, the Railway deploy split, and the per-client undo design.

## Stripe (billing)

```bash
pnpm stripe:seed       # seed Stripe products from scripts/stripe/seed-products.ts
pnpm stripe:listen     # forward webhooks to localhost:3000/api/stripe/webhook
```

## Troubleshooting

### `502 An invalid response was received from the upstream server` from `/auth/v1/*`

Kong (the local Supabase API gateway) cached the auth container's old IP after `pnpm db:reset` restarted it. Restart Kong:

```bash
docker restart supabase_kong_brick_think
```

Takes ~2 seconds. Alternatively `pnpm db:stop && pnpm db:start` restarts everything cleanly.

### `Could not find a production build in the '.next' directory` when running E2E

The `.next` build is missing or stale. Run `pnpm build:e2e` before `pnpm test:e2e`. Don't use plain `pnpm build` for E2E — that targets remote Supabase.

### Port 3000 already in use

You probably have a dev server running. Either stop it, or use a non-default port for Playwright:

```bash
PORT=3200 pnpm test:e2e
```

### `pnpm dev` and `pnpm test:e2e` interfering

Playwright reuses the existing server on port 3000 by default — silently skipping its `webServer.env`, so `E2E_AUTH_ENABLED` isn't set and `/api/test/sign-in` returns 404. Either stop `pnpm dev` first, or run Playwright on a different port (see above). `next dev` also writes into `.next/` and corrupts the production build between runs.

### Magic link sign-up fails against local Supabase

1. Confirm local stack is up: `pnpm db:status`.
2. Confirm dev server is pointed at local: you should be running `pnpm dev:e2e` (not `pnpm dev`).
3. If auth was recently restarted, see the Kong section above.

### Migration is in `supabase/migrations/` but `pnpm db:reset` doesn't apply it

The CLI uses migration timestamps as primary keys. If a duplicate timestamp exists, behavior is undefined. Make sure new migration filenames use a strictly greater `YYYYMMDDHHMMSS` than any existing one.

## Project structure

```
app/                         Next.js App Router
  (authed)/app/              authed routes (designs, sessions, orgs)
  api/                       API routes (test seed, models PATCH, stripe webhook)
  sign-in/                   magic link + Google OAuth
components/                  React components (builder, app shell, share)
lib/                         shared libs (db clients, models types, sessions types, ...)
supabase/migrations/         schema migrations — applied in timestamp order
worker/                      Yjs WebSocket worker (scaffolded; not yet active)
e2e/                         Playwright specs + fixtures
docs/                        local-only docs (specs, plans, followups, conventions) — gitignored
```

## Process notes (for contributors and Claude)

- `docs/` is gitignored — specs, plans, brainstorming output live there locally but never reach the remote.
- One logical unit per commit; conventional-style messages (`feat(scope): …`, `fix(scope): …`).
- Never push to `origin/main` without explicit user authorisation.
- Never run `pnpm db:push` against remote without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.

[CLAUDE.md](CLAUDE.md) has the deeper agent-facing notes — conventions, gotchas, defence-in-depth patterns.

## License

BrickThink is licensed under the [Apache License 2.0](LICENSE). Third-party attribution and provenance live in [NOTICE](NOTICE). Contributions are accepted under the same terms — see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Trademark

LEGO, SERIOUS PLAY, IMAGINOPEDIA, the Minifigure and the Brick and Knob configurations are trademarks of the LEGO Group, which does not sponsor, authorize or endorse this product.
