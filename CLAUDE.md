# BrickThink — Project Notes for Claude

Project-specific guidance. The repository-wide doc policy in [/Users/nareshshan/IdeaProjects/CLAUDE.md](../CLAUDE.md) also applies — `docs/` is gitignored, do not commit anything inside it.

Scoped guidance lives in nested CLAUDE.md files; Claude Code loads them automatically when you touch files in those subtrees:

- [app/(authed)/CLAUDE.md](<app/(authed)/CLAUDE.md>) — UI conventions: nav hierarchy, modal shape, badge pills, hover-revealed row actions.
- [supabase/CLAUDE.md](supabase/CLAUDE.md) — local/remote stack, migrations, Storage conventions, auth providers, Kong + PKCE gotchas.
- [e2e/CLAUDE.md](e2e/CLAUDE.md) — Playwright fixtures, `build:e2e`/`start:e2e` wrapper, workflow gotchas.
- [tests/integration/CLAUDE.md](tests/integration/CLAUDE.md) — Vitest integration suite against local Supabase.

## Deploy target

**Railway, not Vercel.** Config lives in [railway.toml](railway.toml). The web service runs `pnpm start` after a Nixpacks build; healthcheck endpoint is [app/api/health/route.ts](app/api/health/route.ts). A separate worker service (defined under its own block when added) runs `pnpm worker:start` for the Yjs collab backend.

Production hostname: `https://www.brickthink.io` (apex 301-redirects to www). DNS is Namecheap Basic DNS; runbook for the records and how to add new custom domains lives at `docs/infra/railway-custom-domain.md` (local-only, gitignored).

- Don't reach for Vercel-specific patterns (`@vercel/analytics`, `vc env`, Edge Runtime defaults). They work locally with Next.js but the deploy environment is plain Node on Railway.
- Use `RAILWAY_GIT_COMMIT_SHA` for runtime commit identification, not Vercel's variants.
- Both Railway production and preview environments run with `NODE_ENV === 'production'`. Never rely on `NODE_ENV` alone to gate dev-only routes or backdoors — pair it with an explicit allow-list (host check, separate `E2E_AUTH_ENABLED` flag, etc.).

## Schema changes — never autonomous

**`pnpm db:push` against the remote requires explicit user authorisation.** Agents (including subagents) must never run it autonomously — even to unblock E2E or fix what looks like a "trivial" gap. Stop, surface the underlying problem (almost always: "this should run against the local stack via `pnpm build:e2e` / `pnpm start:e2e`"), and wait for a deliberate go-ahead. Pushing to remote is a deploy. Full Supabase guidance in [supabase/CLAUDE.md](supabase/CLAUDE.md).

## Tooling expectations before commit

- `pnpm typecheck` — must exit 0.
- `pnpm lint` — must exit 0.
- `pnpm test` — Vitest, must exit 0.
- `pnpm test:e2e` — Playwright; **build with `pnpm build:e2e` first** (not `pnpm build`). See [e2e/CLAUDE.md](e2e/CLAUDE.md) for env details, fixtures, and gotchas.

## Process

- Specs, plans, brainstorming output → `docs/superpowers/<specs|plans|followups>/`. **Do not commit them.**
- One logical unit per commit. Conventional-style messages (`feat(scope): …`, `fix(scope): …`, `refactor(scope): …`). Recent history is the style guide.
- Never push to `origin/main` without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.
