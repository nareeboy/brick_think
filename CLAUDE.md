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

## Yjs collaboration (`NEXT_PUBLIC_YJS_COLLAB_ENABLED=1`)

Phase 1 of stream 3 introduces a Yjs binding for session-scoped models on the `shared_model` stage. When the flag is on, [BuilderProvider](components/builder/builderState.tsx) mounts [useYjsBinding](components/builder/useYjsBinding.ts) instead of [useAutosave](components/builder/useAutosave.ts); the worker ([worker/src/yjs-server.ts](worker/src/yjs-server.ts)) is the sole writer to both `public.yjs_documents.state` (binary CRDT snapshot) and `public.models.canvas_state` (JSON projection for cold reload, share links, thumbnails). Other stages and all personal/org-shared designs keep using autosave.

WebSocket auth: [/api/yjs/token](app/api/yjs/token/route.ts) mints a 60s HS256 JWT carrying `{ profileId, modelId }`. The worker verifies the signature, asserts the `modelId` claim matches the upgrade URL, and runs `public.can_read_model()` (service-role only) before accepting the upgrade. Shared `YJS_JWT_SECRET` env var between web and worker — generate with `openssl rand -hex 32` per environment; never reuse.

### Stage + permission semantics

- **`shared_model` is one row per (session, stage)**, owned by the session facilitator by convention. Any session-org member who clicks "Start your model" on that stage redirects to the same model id. The elevated insert lives in [`createModelInStage`](<app/(authed)/app/sessions/actions.ts>) via `getServiceSupabaseClient()` because the RLS INSERT policy insists `owner = auth.uid()`; the pre-SELECT of the session through the RLS-scoped client is the authorization gate.
- All other stages (`individual_model`, `system_model`, `guiding_principles`, `skill_building`) remain one row per (session, stage, owner) with idempotent create scoped to the caller.
- **Live mode flips `readOnly` to `false` for every session-org member.** Page is [app/(authed)/app/designs/[id]/page.tsx](<app/(authed)/app/designs/[id]/page.tsx>). Outside live mode (personal designs, non-shared session stages), the existing non-owner = read-only rule still applies.

### Per-client undo (live mode only)

`Cmd+Z` / `Ctrl+Z` and `Cmd+Shift+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` drive per-client undo on shared_model designs. The single window-level keyboard listener and the `Y.UndoManager` live in [useYjsUndoManager](components/builder/useYjsUndoManager.ts); `BuilderProvider` only mounts it when `liveMode && !readOnly && liveDoc !== null`, so the autosave path and read-only share views never attach a listener. The stack is bound to the canvas `Y.Map` with `trackedOrigins: Set([YJS_LOCAL_ORIGIN])`, so seeds (`YJS_SEED_ORIGIN`) and remote peer ops never enter it — each browser context only undoes its own work. The text-edit guard (`INPUT`/`TEXTAREA`/`contentEditable`) preserves browser-native text undo while the title input has focus.

### Production deploy (Railway)

Two services share the repo:

- **Web service** — root [railway.toml](railway.toml), `pnpm start`. Hosts the Next.js app at `www.brickthink.io`. Needs `YJS_JWT_SECRET` (shared) and `NEXT_PUBLIC_YJS_WS_URL=wss://<worker-host>/yjs` baked at build time. `NEXT_PUBLIC_YJS_COLLAB_ENABLED=1` activates the feature for users.
- **Worker service** — [worker/railway.toml](worker/railway.toml), `pnpm worker:start`. Long-running WebSocket server. Needs `YJS_JWT_SECRET` (same value as web) and `WORKER_DATABASE_URL` (Supabase **Session Pooler** URI, port 5432). Configure Railway service Settings → Config-as-Code Path → `worker/railway.toml`.

Operational gotchas baked in by the worker code:

- **Don't set `YJS_PORT` on Railway.** The worker resolves port as `YJS_PORT ?? PORT ?? 1234`; Railway injects `PORT` for its healthcheck. Setting `YJS_PORT` shadows it and the healthcheck fails.
- **`WORKER_DATABASE_URL` must use the Session Pooler** (`aws-…pooler.supabase.com:5432`), not Direct (IPv6-only on Pro plans, blocked from Railway containers) and not Transaction Pooler (port 6543; releases connection per query and breaks the `pg.Pool` semantics the worker assumes).
- **`NEXT_PUBLIC_*` vars are baked at build time.** Changing them on the web service requires a fresh `next build`, which Railway runs on every deploy — but a no-code env-var-only change may *not* trigger one depending on the Nixpacks cache. Force a redeploy from Deployments tab when toggling the flag.
- **Same `YJS_JWT_SECRET` on both services.** Web signs with it, worker verifies with it; any mismatch → 401 `invalid token` on every WS upgrade.
- Worker's persistence path runs `BEGIN; UPSERT yjs_documents; UPDATE models; COMMIT` per debounce. If you see `(ECIRCUITBREAKER) too many authentication failures` from the pooler, the cooldown is per-IP and clears once retries stop — close hammering browser tabs and redeploy the worker to break out cleanly.
- Worker logs structured JSON; `upgrade_rejected` entries include `err` for non-auth failures (Postgres errors, etc.). Tail the worker's Deployments → live log when triaging.

### Local dev

Set `YJS_JWT_SECRET` and `NEXT_PUBLIC_YJS_COLLAB_ENABLED=1` in `.env.local`, then run `pnpm worker:dev` alongside `pnpm dev`. Open a `shared_model` design in two tabs to see live propagation. The worker reads `.env.local` itself via dotenv on boot with `override: false`, so any spawn-injected env wins (used by the integration test fixture to force local Postgres regardless of `.env.local`'s remote URL).

### E2E

[playwright.config.ts](playwright.config.ts) `webServer` boots both `pnpm start:e2e` and the worker; specs at [e2e/yjs-shared-model.spec.ts](e2e/yjs-shared-model.spec.ts). The flag is baked into the e2e build via `.env.test`.

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
