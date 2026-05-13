# BrickThink — Project Notes for Claude

Project-specific guidance. The repository-wide doc policy in [/Users/nareshshan/IdeaProjects/CLAUDE.md](../CLAUDE.md) also applies — `docs/` is gitignored, do not commit anything inside it.

## Deploy target

**Railway, not Vercel.** Config lives in [railway.toml](railway.toml). The web service runs `pnpm start` after a Nixpacks build; healthcheck endpoint is [app/api/health/route.ts](app/api/health/route.ts). A separate worker service (defined under its own block when added) runs `pnpm worker:start` for the Yjs collab backend.

Implications:
- Don't reach for Vercel-specific patterns (`@vercel/analytics`, `vc env`, Edge Runtime defaults). They work locally with Next.js but the deploy environment is plain Node on Railway.
- Use `RAILWAY_GIT_COMMIT_SHA` for runtime commit identification, not Vercel's variants.
- Both Railway production and preview environments run with `NODE_ENV === 'production'`. Never rely on `NODE_ENV` alone to gate dev-only routes or backdoors — pair it with an explicit allow-list (host check, separate `E2E_AUTH_ENABLED` flag, etc.).

## Supabase setup

- Local stack: `pnpm db:start` / `db:reset` (Docker via OrbStack, see `pnpm db:status` for ports).
- Remote project: `wreypwrvfpzjyijpyhkb` (set in `.env.local` `NEXT_PUBLIC_SUPABASE_URL`).
- Schema lives in [supabase/migrations/](supabase/migrations/); never apply DDL outside a migration on the local stack.
- Remote pushes go via `pnpm db:link` / `db:push` (these scripts inline-load `SUPABASE_ACCESS_TOKEN` from `.env.local` because the machine's shared `supabase login` is on a different account). If a `supabase` subcommand isn't covered by an npm script, prefix it manually: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase <cmd> --linked`.

### Auth providers

The sign-in page ([app/sign-in/page.tsx](app/sign-in/page.tsx)) supports magic link and Google OAuth. Post-sign-in destination is `/app/designs` — defaulted in three places ([app/sign-in/actions.ts](app/sign-in/actions.ts), [app/sign-in/page.tsx](app/sign-in/page.tsx), [app/auth/callback/route.ts](app/auth/callback/route.ts)); change all three together.

- **Google OAuth (primary tested path).** Configured in Supabase Dashboard → Authentication → Providers → Google. The OAuth client lives in Google Cloud project `brickthink-auth`; redirect URI in Google **must** match `https://wreypwrvfpzjyijpyhkb.supabase.co/auth/v1/callback` exactly. App is still in Google's "Testing" mode — sign-in works only for the test users listed under OAuth consent screen until the app is published (needs verified domain + privacy policy first).
- **Magic link.** Uses Supabase's built-in email service, which rate-limits at ~4 sends/hour per address. Custom SMTP via Resend is the planned upgrade — env vars `RESEND_API_KEY` / `RESEND_FROM_ADDRESS` exist in [.env.example](.env.example) but are unused; Supabase auth SMTP is configured in the Dashboard, not via app env. Blocked on owning a domain to verify in Resend.
- **Redirect URLs allowlist.** Supabase falls back to Site URL and drops the `?next=` query param if `/auth/callback` isn't whitelisted under URL Configuration. As a defensive net, [app/page.tsx](app/page.tsx) forwards any stray `?code=` on `/` to `/auth/callback?...&next=/app/designs`. Don't remove the forwarder without confirming the allowlist covers wildcard query strings (`http://localhost:3000/**` or equivalent).

## Tooling expectations before commit

- `pnpm typecheck` — must exit 0.
- `pnpm lint` — must exit 0.
- `pnpm test` — Vitest, must exit 0.
- `pnpm test:e2e` — Playwright; runs against a built server (`pnpm start`). Covers both unauthenticated flows ([e2e/auth.spec.ts](e2e/auth.spec.ts)) and authed flows via the `signedInPage` fixture in [e2e/fixtures.ts](e2e/fixtures.ts).

### Playwright auth fixture

`signedInPage` mints a Supabase session by posting to the dev-only [/api/test/sign-in](app/api/test/sign-in/route.ts) route. The route has three independent gates, all required: `E2E_AUTH_ENABLED=1` (set in [playwright.config.ts](playwright.config.ts) webServer env), a `localhost`/`127.0.0.1` host check, and an `@brick-think.test` email pattern. **Never set `E2E_AUTH_ENABLED` on Railway.** Read the comment at the top of the route file before adding, removing, or weakening any gate — `NODE_ENV` was deliberately *not* used as a gate (see the comment for why).

### E2E workflow gotchas

- **Don't run `pnpm dev` concurrently with `pnpm test:e2e`.** Playwright will reuse the dev server on port 3000 — silently skipping `webServer.env` so `E2E_AUTH_ENABLED` is missing and the sign-in route 404s. `next dev` also writes into `.next/` and corrupts the production build between runs.
- If you need both running, use `PORT=3100 pnpm test:e2e`. Re-run `pnpm build` if you see "Could not find a production build in the '.next' directory".
- The fixture creates one `e2e-<rand>@brick-think.test` auth user per test. They're harmless but accumulate — clean them out periodically with a SQL `delete from auth.users where email like 'e2e-%@brick-think.test'`.

## Process

- Specs, plans, brainstorming output → `docs/superpowers/<specs|plans|followups>/`. **Do not commit them.**
- One logical unit per commit. Conventional-style messages (`feat(scope): …`, `fix(scope): …`, `refactor(scope): …`). Recent history is the style guide.
- Never push to `origin/main` without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.
