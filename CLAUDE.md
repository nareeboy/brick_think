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

## Database environments & migrations

Three Railway environments map to **two** Supabase projects:

| Branch | Railway env | Supabase project | How migrations land |
| --- | --- | --- | --- |
| `main` | production (`www.brickthink.io`) | `wreypwrvfpzjyijpyhkb` (**prod**) | [db-migrate.yml](.github/workflows/db-migrate.yml) → **`production` Environment approval gate** |
| `staging` | staging | `fzlyvqcwjadpmrgprfov` (**shared non-prod**) | [db-migrate.yml](.github/workflows/db-migrate.yml), auto |
| `test` | test | `fzlyvqcwjadpmrgprfov` (**shared non-prod**) | [db-migrate.yml](.github/workflows/db-migrate.yml), auto |
| local dev | — | `fzlyvqcwjadpmrgprfov` (**shared non-prod**) | manual `pnpm db:push` |

`test` and `staging` deliberately **share one** Supabase project — they hold non-prod data, so isolating them from each other isn't worth a second project. They are isolated from **prod**, which is the line that matters.

### Branch push authorisation rules

| Branch | Who triggers the push | Authorisation |
| --- | --- | --- |
| `staging` | default — agents may push freely | none needed |
| `test` | only on the user's confirmation | confirm before each push |
| `main` | **never automatic** | **explicit user authorisation every time** |

- **`staging` is the default landing branch.** Routine work is pushed here without asking.
- **`test` pushes require the user to confirm** each time before they happen.
- **`main` pushes always require explicit authorisation** and never happen automatically — this is the production line.
- **Every push to `main` must first ensure the non-prod (test/staging) DB is aligned with the prod DB on Supabase.** In practice: the same migration set must already be applied and validated on the shared non-prod project (via a `staging`/`test` push) *before* `main` is pushed and the gated prod migration is approved. Prod never receives a migration that hasn't been exercised on non-prod first.

**Local `.env.local` points `SUPABASE_PROJECT_REF` at the shared non-prod project.** So a hand-run `pnpm db:push` targets test/staging, never prod — that's the safety default. The only sanctioned path to the prod DB is merging to `main`, which triggers the gated Action. The "never autonomous `pnpm db:push`" rule above still binds humans and agents at the terminal; CI is the exception *because* a human approves the `production` Environment before the prod job runs.

**One-time setup** for the Action ([.github/workflows/db-migrate.yml](.github/workflows/db-migrate.yml)):

- GitHub → Settings → Secrets and variables → Actions:
  - `SUPABASE_ACCESS_TOKEN` — the brick-think account PAT
  - `SUPABASE_DB_PASSWORD_NONPROD` — DB password for `fzlyvqcwjadpmrgprfov`
  - `SUPABASE_DB_PASSWORD_PROD` — DB password for `wreypwrvfpzjyijpyhkb`
- GitHub → Settings → Environments → create `production` with **Required reviewers** enabled. This is the approval gate; without it the prod migration runs unattended.

## Yjs collaboration (`NEXT_PUBLIC_YJS_COLLAB_ENABLED=1`)

Yjs is the live-collab transport for room-backed canvases on `shared_model`, `system_model`, and `guiding_principles`. When the flag is on, [BuilderProvider](components/builder/builderState.tsx) mounts [useYjsBinding](components/builder/useYjsBinding.ts) instead of [useAutosave](components/builder/useAutosave.ts); the worker ([worker/src/yjs-server.ts](worker/src/yjs-server.ts)) is the sole writer to both `public.yjs_documents.state` (binary CRDT snapshot) and `public.models.canvas_state` (JSON projection for cold reload, share links, thumbnails). Other stages and all personal/org-shared designs keep using autosave.

WebSocket auth: [/api/yjs/token](app/api/yjs/token/route.ts) mints a 60s HS256 JWT carrying `{ profileId, modelId }`. The worker verifies the signature, asserts the `modelId` claim matches the upgrade URL, runs `public.can_read_model()` (legacy read gate) and — for any model with `room_id` set — also runs `public.can_edit_room()` (recursive transitive membership). Both functions are `service_role` only. Shared `YJS_JWT_SECRET` env var between web and worker — generate with `openssl rand -hex 32` per environment; never reuse.

### Stage + permission semantics

- **Rooms back every collaborative stage.** `shared_model` partitions org members into rooms (`stage_room_members`); `system_model` and `guiding_principles` compose upstream rooms (`stage_room_sources`). Each room owns exactly one `models` row via `models.room_id` (1-1). The facilitator owns the row but does not gate edit access — membership does, via `public.can_edit_room()`'s recursive walk back to a `shared_model` room the caller is a direct member of. See [app/(authed)/CLAUDE.md "Stage rooms (breakout groups)"](<app/(authed)/CLAUDE.md>) for the full surface (server actions, UI, migration).
- **Non-room stages** (`individual_model`, `skill_building`) remain one personal canvas per (session, stage, owner) with idempotent create scoped to the caller via [`createModelInStage`](<app/(authed)/app/sessions/actions.ts>). On `shared_model` the same action resolves the caller's assigned room and redirects; on `system_model` / `guiding_principles` it routes to the caller's transitive room when rooms exist, else falls through to the legacy personal-canvas flow (rooms are opt-in for downstream stages so legacy sessions keep working).
- **Live mode requires transitive room membership.** [canPlaceLive](lib/yjs/canPlaceLive.ts) takes an `isRoomMember` flag that the design page computes via `can_edit_room` for room-backed canvases. Non-members on a room canvas drop to read-only; the worker also rejects their WS upgrade. Outside live mode (personal designs, non-room stages, non-room legacy data on shared_model — none exist anymore after the backfill), the existing non-owner = read-only rule still applies.

### Per-client undo (live mode only)

`Cmd+Z` / `Ctrl+Z` and `Cmd+Shift+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` drive per-client undo on shared_model designs. The single window-level keyboard listener and the `Y.UndoManager` live in [useYjsUndoManager](components/builder/useYjsUndoManager.ts); `BuilderProvider` only mounts it when `liveMode && !readOnly && liveDoc !== null`, so the autosave path and read-only share views never attach a listener. The stack is bound to the canvas `Y.Map` with `trackedOrigins: Set([YJS_LOCAL_ORIGIN])`, so seeds (`YJS_SEED_ORIGIN`) and remote peer ops never enter it — each browser context only undoes its own work. The text-edit guard (`INPUT`/`TEXTAREA`/`contentEditable`) preserves browser-native text undo while the title input has focus.

### Production deploy (Railway)

Two services share the repo:

- **Web service** — root [railway.toml](railway.toml), `pnpm start`. Hosts the Next.js app at `www.brickthink.io`. Needs `YJS_JWT_SECRET` (shared) and `NEXT_PUBLIC_YJS_WS_URL=wss://<worker-host>/yjs` baked at build time. `NEXT_PUBLIC_YJS_COLLAB_ENABLED=1` activates the feature for users.
- **Worker service** — [worker/railway.toml](worker/railway.toml), `pnpm worker:start`. Long-running WebSocket server. Needs `YJS_JWT_SECRET` (same value as web) and `WORKER_DATABASE_URL` (Supabase **Session Pooler** URI, port 5432). Configure Railway service Settings → Config-as-Code Path → `worker/railway.toml`.

Operational gotchas baked in by the worker code:

- **Don't set `YJS_PORT` on Railway.** The worker resolves port as `YJS_PORT ?? PORT ?? 1234`; Railway injects `PORT` for its healthcheck. Setting `YJS_PORT` shadows it and the healthcheck fails.
- **`WORKER_DATABASE_URL` must use the Session Pooler** (`aws-…pooler.supabase.com:5432`), not Direct (IPv6-only on Pro plans, blocked from Railway containers) and not Transaction Pooler (port 6543; releases connection per query and breaks the `pg.Pool` semantics the worker assumes).
- **`NEXT_PUBLIC_*` vars are baked at build time.** Changing them on the web service requires a fresh `next build`, which Railway runs on every deploy — but a no-code env-var-only change may _not_ trigger one depending on the Nixpacks cache. Force a redeploy from Deployments tab when toggling the flag.
- **Same `YJS_JWT_SECRET` on both services.** Web signs with it, worker verifies with it; any mismatch → 401 `invalid token` on every WS upgrade.
- Worker's persistence path runs `BEGIN; UPSERT yjs_documents; UPDATE models; COMMIT` per debounce. If you see `(ECIRCUITBREAKER) too many authentication failures` from the pooler, the cooldown is per-IP and clears once retries stop — close hammering browser tabs and redeploy the worker to break out cleanly.
- Worker logs structured JSON; `upgrade_rejected` entries include `err` for non-auth failures (Postgres errors, etc.). Tail the worker's Deployments → live log when triaging.

### Local dev

Set `YJS_JWT_SECRET` and `NEXT_PUBLIC_YJS_COLLAB_ENABLED=1` in `.env.local`, then run `pnpm worker:dev` alongside `pnpm dev`. Live propagation needs a room: on the session page, click `Create rooms` on `shared_model` and partition members, then open the room canvas in two tabs (each tab signed in as a member of that room). The worker reads `.env.local` itself via dotenv on boot with `override: false`, so any spawn-injected env wins (used by the integration test fixture to force local Postgres regardless of `.env.local`'s remote URL).

**`WORKER_DATABASE_URL` — local vs remote toggle.** The default `.env.local` carries a _remote_ `WORKER_DATABASE_URL` (the project's session pooler) so production-shaped scripts work out of the box. But the local Yjs flow — `pnpm dev` (or `pnpm dev:e2e`) creating a session + model in local Supabase, two browsers opening that model — needs the worker pointed at **local** Postgres, otherwise `can_read_model` runs against the remote DB which doesn't have the local model id and rejects every WS upgrade with `upgrade_rejected status=403 reason="not a member"`. Convention in `.env.local`:

```
# Remote pooler — uncomment ONLY when deliberately testing against prod data
# WORKER_DATABASE_URL=postgresql://postgres.<projectref>:<password>@<pooler-host>:5432/postgres
WORKER_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

dotenv resolves duplicate keys with last-wins within a single file, so keeping the local URL below a commented-out remote line makes "local is primary, flip to remote by toggling the comment markers" a one-line edit. Restart `pnpm worker:dev` after toggling — the worker reads `.env.local` only on boot.

### E2E

[playwright.config.ts](playwright.config.ts) `webServer` boots both `pnpm start:e2e` and the worker; specs at [e2e/yjs-shared-model.spec.ts](e2e/yjs-shared-model.spec.ts). The flag is baked into the e2e build via `.env.test`.

## Tooling expectations before commit

- `pnpm typecheck` — must exit 0.
- `pnpm lint` — must exit 0.
- `pnpm test` — Vitest, must exit 0.
- `pnpm test:e2e` — Playwright; **build with `pnpm build:e2e` first** (not `pnpm build`). See [e2e/CLAUDE.md](e2e/CLAUDE.md) for env details, fixtures, and gotchas.

## Process

- **Every change request runs in a git worktree.** Before touching code for a new feature, fix, or refactor, create an isolated worktree (e.g. via the `superpowers:using-git-worktrees` skill or `git worktree add ../brick_think-<slug> -b <branch>`). Do not edit files on `main` in the primary checkout. Recent history follows this convention — see the `worktree-feat-…` merge commits. Worktrees that produce no changes should be cleaned up; merged ones are removed after the integration commit lands on `main`.
- Specs, plans, brainstorming output → `docs/superpowers/<specs|plans|followups>/`. **Do not commit them.**
- One logical unit per commit. Conventional-style messages (`feat(scope): …`, `fix(scope): …`, `refactor(scope): …`). Recent history is the style guide.
- Never push to `origin/main` without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.
