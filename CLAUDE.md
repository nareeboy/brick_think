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

The project uses Supabase Storage for the `model-thumbnails` bucket (canvas previews on `/app/my-designs`). Future buckets (user avatars, attachments, org-shared thumbnails) should follow the same pattern unless there's a specific reason not to:

- **Private buckets, signed URLs.** `public = false` on the bucket; resolve URLs server-side with `supabase.storage.from('<bucket>').createSignedUrls(paths, 60 * 60)`. Use the plural `createSignedUrls()` (batched, one round-trip) on list pages, not the singular per row.
- **Owner-folder paths.** Path convention `${auth.uid()}/<resource-id>.<ext>` so the Storage RLS policy `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership at the bucket level — symmetric with the row's `owner_profile_id = auth.uid()` RLS.
- **Verify ownership before uploading.** The Storage RLS only checks the path's user-folder; it doesn't know whether `<resource-id>` actually belongs to the user. Always SELECT the parent row through the user-scoped client first — otherwise a client can write orphan bytes at `${user.id}/<someone-elses-resource>.png`.
- **Cache buster on signed URLs.** Append `&v=${updated_at}` (or another monotonic field) to the signed URL. Supabase signed URLs are deterministic for a given `(path, expiresIn)` within the TTL — without a buster, browsers cache stale images after an overwrite.
- **Plain `<img>` over `next/image`.** Avoids whitelisting the Supabase storage hostname in `next.config.mjs` and skips the optimisation pipeline cost on Railway. Suppress the `@next/next/no-img-element` warning with an inline `// eslint-disable-next-line` plus a rationale (see [app/(authed)/app/my-designs/DesignList.tsx](app/(authed)/app/my-designs/DesignList.tsx)).
- **Hard-delete cleanup is the caller's job.** Deleting the row does NOT cascade to Storage. Server actions that hard-delete rows must explicitly `storage.from('<bucket>').remove([paths])` first. Cascade-via-FK doesn't exist for `storage.objects`.

### Auth providers

The sign-in page ([app/sign-in/page.tsx](app/sign-in/page.tsx)) supports magic link and Google OAuth. Post-sign-in destination is `/app/my-designs` — defaulted in three places ([app/sign-in/actions.ts](app/sign-in/actions.ts), [app/sign-in/page.tsx](app/sign-in/page.tsx), [app/auth/callback/route.ts](app/auth/callback/route.ts)); change all three together.

- **Google OAuth (primary tested path).** Configured in Supabase Dashboard → Authentication → Providers → Google. The OAuth client lives in Google Cloud project `brickthink-auth`; redirect URI in Google **must** match `https://wreypwrvfpzjyijpyhkb.supabase.co/auth/v1/callback` exactly. Published 2026-05-15 — out of Testing mode, any Google account can sign in. Branding (privacy / terms links) lives on the OAuth consent screen.
- **Magic link.** Transports through Resend SMTP via Supabase Auth's custom-SMTP bridge. From: `hello@brickthink.io`; sending domain `brickthink.io` is verified in Resend with SPF / DKIM / DMARC records on Namecheap. Reply-To surfaces in the email footer (the Supabase SMTP bridge doesn't pass a Reply-To header through, so it's an inline `mailto:` instead). The `RESEND_API_KEY` / `RESEND_FROM_ADDRESS` entries in [.env.example](.env.example) are documentation reminders only — Next.js doesn't read them; the source of truth for the SMTP password is the Supabase Dashboard. Resend free tier allows 100 sends / day with no per-recipient throttle (the prior ~4/hour built-in-email limit is gone). Local dev still uses Inbucket (`http://127.0.0.1:54324`) — deliberately not pointed at Resend to avoid burning free-tier sends and to keep `pnpm db:reset` cycles fast.
- **Redirect URLs allowlist.** Supabase falls back to Site URL and drops the `?next=` query param if `/auth/callback` isn't whitelisted under URL Configuration. As a defensive net, [app/page.tsx](app/page.tsx) forwards any stray `?code=` on `/` to `/auth/callback?...&next=/app/my-designs`. Don't remove the forwarder without confirming the allowlist covers wildcard query strings (`http://localhost:3000/**` or equivalent).

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

### Vitest integration tests against local Supabase

`pnpm test:integration` runs the suite under [tests/integration/](tests/integration/) against the local Supabase stack (`pnpm db:start`). Configured separately from the unit suite — different config ([vitest.integration.config.ts](vitest.integration.config.ts)) and env loaded from `.env.test` via `dotenv-cli`. The default `pnpm test` excludes `tests/integration/**` so unit runs stay stack-independent.

Each test creates disposable users (`@brick-think.test`) + org + session via the [lib/testing/supabase-test-client.ts](lib/testing/supabase-test-client.ts) factory and cleans up in `afterAll` (sessions → orgs → model_versions → `admin.deleteUser`, mirroring the same NO-ACTION FK dance as `/api/test/delete-user`). No `pnpm db:reset` between tests; isolation comes from randomised emails and per-file cleanup.

Node 21 / 22 lacks native `globalThis.WebSocket`, which supabase-js's RealtimeClient hits at `createClient()`. [tests/integration/setup.ts](tests/integration/setup.ts) polyfills it from the already-installed `ws` package.

This harness is the answer to the [stream #2 deferred-tests punch list](docs/superpowers/followups/2026-05-14-session-scoped-designs-deferred-tests.md). When stream #3 (Yjs collab) lands new RLS surface, write the new invariants alongside the existing ones rather than spinning up parallel infrastructure.

## UI conventions

### Navigation hierarchy: Organisations → Sessions → Designs

The app's IA is a single hierarchy with one cross-cutting index. Context comes from the URL on each page — there is no global "active org" state on the profile, no header switcher. The header has exactly two links: `Organisations` and `My Designs`.

- **`/app/my-designs`** ([app/(authed)/app/my-designs/page.tsx](<app/(authed)/app/my-designs/page.tsx>)) is the aggregate index of every design the signed-in user has authored (`owner_profile_id = me`), regardless of where it lives. Each card carries a badge: `Personal` (model has no session/org) or `{Org} · {Session}` (session-scoped). The page-level Filter dropdown narrows by Personal or by a specific org via `?filter=personal|org-<uuid>`; the URL is the source of truth (see [lib/my-designs/types.ts](lib/my-designs/types.ts) `parseFilter` / `serializeFilter`).
- **`/app/orgs`** lists the orgs you're a member of; clicking one navigates to **`/app/orgs/[id]`** which shows that org's sessions list (primary content), member roster, and admin actions. Sessions list is the default surface — no separate `/app/orgs/[id]/sessions` route. The header carries the action group on the right: leave (icon), delete (icon, owner-only), and `Create session` (primary). Creating a session and adding a member both happen in modal dialogs ([NewSessionDialog.tsx](<app/(authed)/app/orgs/[id]/sessions/NewSessionDialog.tsx>), [AddMemberDialog.tsx](<app/(authed)/app/orgs/[id]/AddMemberDialog.tsx>)) — no inline forms on the page.
- **`/app/sessions/[id]`** is the session detail page. Its eyebrow renders a breadcrumb `Organisations / {Org} / Session · {status}` linking back through the hierarchy. The facilitator-only "Session settings" panel (status / mode / scheduled-for) lives in [SessionMetaForm.tsx](<app/(authed)/app/sessions/[id]/SessionMetaForm.tsx>) and the `updateSessionMeta` action in [actions.ts](<app/(authed)/app/sessions/actions.ts>) — both intact, both real columns on `sessions`, but the panel is **not currently rendered**: nothing in the app branches on those fields yet, so showing an editor that has no observable effect was misleading. Re-import the component on [page.tsx](<app/(authed)/app/sessions/[id]/page.tsx>) when status/mode/scheduled-for actually drive behaviour (state-machine, scheduling, async-mode UX, etc.).
- Sessions are **always org-scoped** (`sessions.org_id NOT NULL`). Designs in the org case are **always session-scoped**: a model has either `(org_id IS NULL AND session_id IS NULL)` for Personal, or `(org_id IS NULL AND session_id IS NOT NULL)` for session-scoped — the `models_context_exclusive` CHECK forbids both being set. The legacy "org-standalone" state (`org_id` set, `session_id` null) was migrated away in [supabase/migrations/20260515000000_nav_restructure.sql](supabase/migrations/20260515000000_nav_restructure.sql).

### New-design entry points

- **From `/app/my-designs`:** the `New design` button opens a two-step wizard ([NewDesignDialog.tsx](<app/(authed)/app/my-designs/NewDesignDialog.tsx>)) — pick destination (Personal + each org), then pick session (skipped for Personal, includes inline "+ New session"). The wizard calls `createDesignAction({orgId, sessionId})` in [my-designs/actions.ts](<app/(authed)/app/my-designs/actions.ts>).
- **From inside `/app/sessions/[id]`:** each stage has its own "New model" affordance that calls `createModelInStage` directly — no wizard, design lands in that stage.
- **Send to a session:** personal designs only. The card on `/app/my-designs` shows a paper-plane button next to the trash; opens [SendToSessionDialog.tsx](<app/(authed)/app/my-designs/SendToSessionDialog.tsx>) which picks org → session and calls `duplicateToSessionAction`. One-way copy: source stays where it was.

When you add a new authenticated list page, derive its context from the URL or page-level props (a server component reads memberships + filters from `searchParams`). Do not reintroduce a global switcher or any `profiles.active_org_id`-style mutable context column — it was removed for a reason (URL-driven context is shareable, bookmarkable, and survives reloads without a round-trip).

### Modal dialog shape

When a destructive action or a multi-field create flow needs confirmation/input, use a centered modal — not an inline expand-in-place form. The shape is repeated across [NewDesignDialog.tsx](<app/(authed)/app/my-designs/NewDesignDialog.tsx>), [SendToSessionDialog.tsx](<app/(authed)/app/my-designs/SendToSessionDialog.tsx>), [NewSessionDialog.tsx](<app/(authed)/app/orgs/[id]/sessions/NewSessionDialog.tsx>), [AddMemberDialog.tsx](<app/(authed)/app/orgs/[id]/AddMemberDialog.tsx>), [DeleteOrgButton.tsx](<app/(authed)/app/orgs/[id]/DeleteOrgButton.tsx>), and [LeaveOrgButton.tsx](<app/(authed)/app/orgs/[id]/LeaveOrgButton.tsx>):

- Backdrop: `fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.
- Dismissal: click-outside (`onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`) **and** `Escape` (window keydown listener wired in a `useEffect`). Both are required — neither alone covers keyboard + pointer users.
- Inner panel: `w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]`.
- Focus the first input/affordance on open via a `useRef` + `inputRef.current?.focus()` effect. Don't use `autoFocus` on inputs that mount on page load.
- Server-action errors render inline inside the modal, not as a toast. NEXT_REDIRECT throws from a server action are success — rethrow them so Next can perform the redirect.

The backdrop is a non-interactive `<div>` with a click handler, which trips `jsx-a11y/click-events-have-key-events` and `jsx-a11y/no-noninteractive-element-interactions`. Suppress with an inline `eslint-disable-next-line` directly above the offending `<div>` — not above `return (` (the directive doesn't carry across the newline and lint will still error).

### Icon-trigger header actions

Header actions for low-frequency destructive operations (leave/delete an org, future archive/export buttons) are icon-only buttons (`h-9 w-9` square, `aria-label` + `title`) that open the modal above. Don't ship a labeled red button in a header — it screams louder than it should. Keep `Create session`-style primary buttons full-width with the label, since those are the action you want users to take.

### Badge pill convention

Status-style metadata on cards uses a consistent pill: `inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600`. Used for the `Personal` / `{Org}` badge on design cards ([DesignList.tsx](<app/(authed)/app/my-designs/DesignList.tsx>)) and the role chip on member cards ([MemberRow.tsx](<app/(authed)/app/orgs/[id]/MemberRow.tsx>)). When a card carries two related metadata points (org name + session title), put the categorical one (org name) in the pill and leave the human-readable one (session title) as plain `text-[12px] text-zinc-600` next to it.

### Hover-revealed row actions

Destructive or secondary card actions (trash, send, remove member) sit absolutely-positioned in the card's top-right, `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`. The `[@media(hover:none)]` query keeps them visible on touch where there's no hover. The parent card needs `group relative`.

## Process

- Specs, plans, brainstorming output → `docs/superpowers/<specs|plans|followups>/`. **Do not commit them.**
- One logical unit per commit. Conventional-style messages (`feat(scope): …`, `fix(scope): …`, `refactor(scope): …`). Recent history is the style guide.
- Never push to `origin/main` without explicit user authorisation.
- Never skip git hooks (`--no-verify`) without an explicit ask.
