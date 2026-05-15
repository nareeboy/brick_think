# BrickThink — Project Notes for Claude

Project-specific guidance. The repository-wide doc policy in [/Users/nareshshan/IdeaProjects/CLAUDE.md](../CLAUDE.md) also applies — `docs/` is gitignored, do not commit anything inside it.

## Deploy target

**Railway, not Vercel.** Config lives in [railway.toml](railway.toml). The web service runs `pnpm start` after a Nixpacks build; healthcheck endpoint is [app/api/health/route.ts](app/api/health/route.ts). A separate worker service (defined under its own block when added) runs `pnpm worker:start` for the Yjs collab backend.

Production hostname: `https://www.brickthink.io` (apex 301-redirects to www). DNS is Namecheap Basic DNS; runbook for the records and how to add new custom domains lives at `docs/infra/railway-custom-domain.md` (local-only, gitignored).

Implications:
- Don't reach for Vercel-specific patterns (`@vercel/analytics`, `vc env`, Edge Runtime defaults). They work locally with Next.js but the deploy environment is plain Node on Railway.
- Use `RAILWAY_GIT_COMMIT_SHA` for runtime commit identification, not Vercel's variants.
- Both Railway production and preview environments run with `NODE_ENV === 'production'`. Never rely on `NODE_ENV` alone to gate dev-only routes or backdoors — pair it with an explicit allow-list (host check, separate `E2E_AUTH_ENABLED` flag, etc.).

## Supabase setup

- Local stack: `pnpm db:start` / `db:reset` (Docker via OrbStack, see `pnpm db:status` for ports).
- Remote project: `wreypwrvfpzjyijpyhkb` (set in `.env.local` `NEXT_PUBLIC_SUPABASE_URL`).
- Schema lives in [supabase/migrations/](supabase/migrations/); never apply DDL outside a migration on the local stack.
- Remote pushes go via `pnpm db:link` / `db:push` (these scripts inline-load `SUPABASE_ACCESS_TOKEN` from `.env.local` because the machine's shared `supabase login` is on a different account). If a `supabase` subcommand isn't covered by an npm script, prefix it manually: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase <cmd> --linked`.
- **`pnpm db:push` against the remote requires explicit user authorisation.** Agents (including subagents) must never run it autonomously — even to unblock E2E or fix what looks like a "trivial" gap. Stop, surface the underlying problem (almost always: "this should run against the local stack via `pnpm build:e2e` / `pnpm start:e2e`"), and wait for a deliberate go-ahead. Pushing to remote is a deploy.

### Out-of-band schema changes

If a migration's SQL has already been applied to the remote by hand (Dashboard SQL editor) before the file lands in `supabase/migrations/`, two follow-up rules to keep things consistent:

1. **Write the migration idempotently.** Guard every statement: `add column if not exists`, `insert ... on conflict (id) do nothing`, `drop policy if exists "<name>"` before each `create policy`. That way `pnpm db:push` against the already-migrated remote is a safe no-op AND `pnpm db:reset` on a fresh local replays cleanly. See [supabase/migrations/20260513100000_model_thumbnails.sql](supabase/migrations/20260513100000_model_thumbnails.sql) as the reference.
2. **Repair the migration history.** After committing the file, run once to record the migration as applied so future pushes skip it: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase migration repair --status applied <yyyymmddhhmmss> --linked`. The repair is the polite path; absence of it doesn't break correctness because the migration is idempotent.

### Supabase Storage conventions

The project uses Supabase Storage for the `model-thumbnails` bucket (canvas previews on `/app/designs`). Future buckets (user avatars, attachments, org-shared thumbnails) should follow the same pattern unless there's a specific reason not to:

- **Private buckets, signed URLs.** `public = false` on the bucket; resolve URLs server-side with `supabase.storage.from('<bucket>').createSignedUrls(paths, 60 * 60)`. Use the plural `createSignedUrls()` (batched, one round-trip) on list pages, not the singular per row.
- **Owner-folder paths.** Path convention `${auth.uid()}/<resource-id>.<ext>` so the Storage RLS policy `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership at the bucket level — symmetric with the row's `owner_profile_id = auth.uid()` RLS.
- **Verify ownership before uploading.** The Storage RLS only checks the path's user-folder; it doesn't know whether `<resource-id>` actually belongs to the user. Always SELECT the parent row through the user-scoped client first — otherwise a client can write orphan bytes at `${user.id}/<someone-elses-resource>.png`.
- **Cache buster on signed URLs.** Append `&v=${updated_at}` (or another monotonic field) to the signed URL. Supabase signed URLs are deterministic for a given `(path, expiresIn)` within the TTL — without a buster, browsers cache stale images after an overwrite.
- **Plain `<img>` over `next/image`.** Avoids whitelisting the Supabase storage hostname in `next.config.mjs` and skips the optimisation pipeline cost on Railway. Suppress the `@next/next/no-img-element` warning with an inline `// eslint-disable-next-line` plus a rationale (see [app/(authed)/app/designs/DesignList.tsx](app/(authed)/app/designs/DesignList.tsx)).
- **Hard-delete cleanup is the caller's job.** Deleting the row does NOT cascade to Storage. Server actions that hard-delete rows must explicitly `storage.from('<bucket>').remove([paths])` first. Cascade-via-FK doesn't exist for `storage.objects`.

### Auth providers

The sign-in page ([app/sign-in/page.tsx](app/sign-in/page.tsx)) supports magic link and Google OAuth. Post-sign-in destination is `/app/designs` — defaulted in three places ([app/sign-in/actions.ts](app/sign-in/actions.ts), [app/sign-in/page.tsx](app/sign-in/page.tsx), [app/auth/callback/route.ts](app/auth/callback/route.ts)); change all three together.

- **Google OAuth (primary tested path).** Configured in Supabase Dashboard → Authentication → Providers → Google. The OAuth client lives in Google Cloud project `brickthink-auth`; redirect URI in Google **must** match `https://wreypwrvfpzjyijpyhkb.supabase.co/auth/v1/callback` exactly. App is still in Google's "Testing" mode — sign-in works only for the test users listed under OAuth consent screen until the app is published (needs verified domain + privacy policy first).
- **Magic link.** Uses Supabase's built-in email service, which rate-limits at ~4 sends/hour per address. Custom SMTP via Resend is the planned upgrade — env vars `RESEND_API_KEY` / `RESEND_FROM_ADDRESS` exist in [.env.example](.env.example) but are unused; Supabase auth SMTP is configured in the Dashboard, not via app env. Blocked on owning a domain to verify in Resend.
- **Redirect URLs allowlist.** Supabase falls back to Site URL and drops the `?next=` query param if `/auth/callback` isn't whitelisted under URL Configuration. As a defensive net, [app/page.tsx](app/page.tsx) forwards any stray `?code=` on `/` to `/auth/callback?...&next=/app/designs`. Don't remove the forwarder without confirming the allowlist covers wildcard query strings (`http://localhost:3000/**` or equivalent).

## Tooling expectations before commit

- `pnpm typecheck` — must exit 0.
- `pnpm lint` — must exit 0.
- `pnpm test` — Vitest, must exit 0.
- `pnpm test:e2e` — Playwright; runs against a built server. **Build with `pnpm build:e2e` first** (not `pnpm build` — see below). Covers both unauthenticated flows ([e2e/auth.spec.ts](e2e/auth.spec.ts)) and authed flows via the `signedInPage` fixture in [e2e/fixtures.ts](e2e/fixtures.ts).

### E2E env — local Supabase, not remote

E2E exercises the **local** Supabase stack (`pnpm db:start`), not the remote project. `pnpm build:e2e` and `pnpm start:e2e` wrap `next build` / `next start` with `dotenv-cli` to load [.env.test](.env.test) instead of `.env.local`. `.env.test` is committed and contains the well-known Supabase CLI demo JWTs — public knowledge, only valid against `http://127.0.0.1:54321`. [playwright.config.ts](playwright.config.ts) `webServer.command` is `pnpm start:e2e`.

This is the second half of the fix: never push a WIP migration to remote just to make E2E pass. New migrations must apply cleanly via `pnpm db:reset` (against the local stack) before E2E.

For interactive local-Supabase development (manually testing UI changes against the local stack with Mailpit for magic-link emails, no rate limits), `pnpm dev:e2e` is the symmetric wrapper around `next dev`. Use this instead of `pnpm dev` when you want sign-up to land in Mailpit at `http://127.0.0.1:54324` rather than going through the remote project's email service.

### Kong stale-upstream after `pnpm db:reset`

Local Supabase runs `kong` as the API gateway in front of `gotrue` (auth), `postgrest`, etc. Kong resolves each upstream's container IP at startup. `pnpm db:reset` restarts the auth container, which gets a new Docker IP — but Kong's resolved upstream still points at the old (now-dead) IP. Symptom: any call through `/auth/v1/...` returns `502 An invalid response was received from the upstream server`, often surfacing in the UI as a serialised empty-object `{}` error message because some Supabase JS clients lose the upstream's message in serialisation.

Fix: `docker restart supabase_kong_brick_think` to force Kong to re-resolve upstreams. Takes ~2 seconds. Alternatively `pnpm db:stop && pnpm db:start` restarts everything cleanly.

### Magic-link PKCE: localhost vs 127.0.0.1 host pinning

Symptom while running `pnpm dev:e2e` (or `pnpm dev`): you submit the magic-link form, click the link in Mailpit, and the sign-in page comes back with **"PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared…"**.

Cause: PKCE is host-pinned. The verifier cookie is set during the `sendMagicLink` server action ([app/sign-in/actions.ts](app/sign-in/actions.ts)) on whichever hostname the browser used. The callback ([app/auth/callback/route.ts](app/auth/callback/route.ts)) only finds that cookie if you land back on the same hostname. Local Supabase's [supabase/config.toml](supabase/config.toml) ships with `site_url = "http://localhost:3000"` and an allowlist scoped to `localhost:3000` only — so if you initiated the flow on `http://127.0.0.1:3000`, GoTrue ignores `127.0.0.1` in `emailRedirectTo`, falls back to `site_url`, and the callback runs on `localhost` with no matching cookie. Same failure mode if you click the email link in a different browser/profile from where you started.

Fix, easiest first:
1. **Always open the app at `http://localhost:3000` exactly** (not `127.0.0.1:3000`) and click the link in the same browser profile. This is the canonical path.
2. Don't run `pnpm dev` and `pnpm dev:e2e` concurrently — they share port 3000 and `.next/` and corrupt each other's auth cookies (project ref differs between local and remote Supabase, so cookies don't carry over either).
3. If you previously signed in against the remote project on `localhost`, clear site data for `localhost:3000` once when switching to `pnpm dev:e2e` — the stale remote-project cookie can shadow the local one.
4. Only widen the allowlist if you genuinely need both hosts to work locally. Add `"http://127.0.0.1:3000/**"` (and the wildcard form of localhost) to `additional_redirect_urls` in [supabase/config.toml](supabase/config.toml), then `pnpm db:stop && pnpm db:start` so GoTrue re-reads it. Don't ship this change unless there's a reason — keeping the surface tight is the point.

### Playwright auth fixture

`signedInPage` mints a Supabase session by posting to the dev-only [/api/test/sign-in](app/api/test/sign-in/route.ts) route. The route has three independent gates, all required: `E2E_AUTH_ENABLED=1` (set in [playwright.config.ts](playwright.config.ts) webServer env), a `localhost`/`127.0.0.1` host check, and an `@brick-think.test` email pattern. **Never set `E2E_AUTH_ENABLED` on Railway.** Read the comment at the top of the route file before adding, removing, or weakening any gate — `NODE_ENV` was deliberately *not* used as a gate (see the comment for why).

### E2E workflow gotchas

- **Don't run `pnpm dev` concurrently with `pnpm test:e2e`.** Playwright will reuse the dev server on port 3000 — silently skipping `webServer.env` so `E2E_AUTH_ENABLED` is missing and the sign-in route 404s. `next dev` also writes into `.next/` and corrupts the production build between runs.
- If you need both running, use `PORT=3100 pnpm test:e2e`. Re-run `pnpm build:e2e` if you see "Could not find a production build in the '.next' directory".
- The fixture creates one `e2e-<rand>@brick-think.test` auth user per test and deletes it in fixture teardown via [/api/test/delete-user](app/api/test/delete-user/route.ts), so `auth.users` no longer accumulates. If a teardown ever fails (logged as `[e2e] cleanup failed …`), the fallback sweep is `delete from auth.users where email like 'e2e-%@brick-think.test'`. The delete route uses the same three-gate defence as `/api/test/sign-in` plus a hard refusal to touch any user whose email isn't in the test domain.

### Playwright session-seed fixture

`seededSession` (in [e2e/fixtures.ts](e2e/fixtures.ts)) creates a fresh session and its five stages per test via the dev-only [/api/test/seed-session](app/api/test/seed-session/route.ts) route. The route has three independent gates, all required: `E2E_SESSIONS_ENABLED=1` (set in [playwright.config.ts](playwright.config.ts) `webServer.env`), a `localhost`/`127.0.0.1` host check, and the same `@brick-think.test` email allowlist on `callerEmail`. **Never set `E2E_SESSIONS_ENABLED` on Railway.** Same defence-in-depth pattern as `/api/test/sign-in`; read the comment at the top of the route file before adding, removing, or weakening any gate.

The fixture requires the caller to have signed in once first via `/api/test/sign-in` (the seed route looks up the profile row by email). It bootstraps an org + owner membership for a brand-new test user if `profiles.active_org_id` is null. The created session is owned by the caller as facilitator. The owner membership is inserted automatically by the `handle_new_organisation` DB trigger; the route only inserts the org row and updates `profiles.active_org_id`.

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

### Vitest integration tests against local Supabase

`pnpm test:integration` runs the suite under [tests/integration/](tests/integration/) against the local Supabase stack (`pnpm db:start`). Configured separately from the unit suite — different config ([vitest.integration.config.ts](vitest.integration.config.ts)) and env loaded from `.env.test` via `dotenv-cli`. The default `pnpm test` excludes `tests/integration/**` so unit runs stay stack-independent.

Each test creates disposable users (`@brick-think.test`) + org + session via the [lib/testing/supabase-test-client.ts](lib/testing/supabase-test-client.ts) factory and cleans up in `afterAll` (sessions → orgs → model_versions → `admin.deleteUser`, mirroring the same NO-ACTION FK dance as `/api/test/delete-user`). No `pnpm db:reset` between tests; isolation comes from randomised emails and per-file cleanup.

Node 21 / 22 lacks native `globalThis.WebSocket`, which supabase-js's RealtimeClient hits at `createClient()`. [tests/integration/setup.ts](tests/integration/setup.ts) polyfills it from the already-installed `ws` package.

This harness is the answer to the [stream #2 deferred-tests punch list](docs/superpowers/followups/2026-05-14-session-scoped-designs-deferred-tests.md). When stream #3 (Yjs collab) lands new RLS surface, write the new invariants alongside the existing ones rather than spinning up parallel infrastructure.

## UI conventions

### Org context lives on the page, not the global header

The `ContextSwitcher` is rendered **inside each org-scoped list page**, not in the [GlobalHeader](components/app/GlobalHeader.tsx). The pattern (see [app/(authed)/app/designs/page.tsx](<app/(authed)/app/designs/page.tsx>) and [app/(authed)/app/sessions/page.tsx](<app/(authed)/app/sessions/page.tsx>) as the canonical references):

1. Fetch `org_memberships` + `profiles.active_org_id` in the page's server component.
2. Render the active context name (`activeOrgName ?? 'Personal'`) as the eyebrow above the page title — *not* the literal string "BrickThink".
3. Beneath the title row, render `<label>Organisation:</label>` + `<ContextSwitcher orgs activeOrgId buttonId="organisation-switcher" />` so users know which menu controls what they're looking at.

When you add a new org-scoped list page, follow the same shape rather than reintroducing a header-level switcher. The page-level placement makes "whose data is this?" visible without opening the menu, and keeps each list page self-contained.

## Process

- Specs, plans, brainstorming output → `docs/superpowers/<specs|plans|followups>/`. **Do not commit them.**
- One logical unit per commit. Conventional-style messages (`feat(scope): …`, `fix(scope): …`, `refactor(scope): …`). Recent history is the style guide.
- Never push to `origin/main` without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.
