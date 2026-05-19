# Supabase — local stack, migrations, Storage, auth

Scope: anything that touches `supabase/migrations/`, `supabase/config.toml`, RLS policies, Storage buckets, or the auth flow. The root [CLAUDE.md](../CLAUDE.md) carries the hard rule that `pnpm db:push` is never autonomous — that rule applies everywhere, repeated there so frontend work also sees it.

## Local stack and remote project

- Local stack: `pnpm db:start` / `db:reset` (Docker via OrbStack, see `pnpm db:status` for ports).
- Remote project ref lives in `.env.local` as `SUPABASE_PROJECT_REF` (also baked into `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`).
- Schema lives in [migrations/](migrations/); never apply DDL outside a migration on the local stack.
- Remote pushes go via `pnpm db:link` / `db:push` (these scripts inline-load `SUPABASE_ACCESS_TOKEN` from `.env.local` because the machine's shared `supabase login` is on a different account). If a `supabase` subcommand isn't covered by an npm script, prefix it manually: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase <cmd> --linked`.

## Per-user accessibility preferences

`profiles.a11y_preferences jsonb not null default '{}'::jsonb` (added in [migrations/20260518000000_profile_a11y_preferences.sql](migrations/20260518000000_profile_a11y_preferences.sql) for the WCAG 2.2 AA remediation) is the catch-all for per-user a11y settings. Initially carries `{ colourblindMode?: boolean }`; future a11y preferences (high-contrast palette, reduced-motion override, etc.) slot in here without further schema work.

Always read via [`normaliseA11yPreferences`](../lib/a11y/preferences.ts) (defends against bad JSON / schema drift; applies `A11Y_PREFERENCES_DEFAULTS` for missing fields). Writes happen exclusively through [`updateA11yPreferencesAction`](<../app/(authed)/app/account/actions.ts>) — there's no direct table mutation path. The Supabase-generated `Json` type doesn't structurally satisfy the closed `A11yPreferences` interface; the action casts via `as unknown as Json` at the `.update()` call. That's expected — runtime payload is valid JSON.

## Stage controller runtime state

Four migrations (`20260518120000_stage_runtime_state`, `20260518130000_stages_realtime_identity`, `20260518140000_backfill_stage_durations`, `20260519000000_stage_events_reset_verb`) shape the live session surface:

- `public.stage_status` enum + runtime columns on `public.stages` (`status`, `paused_at`, `total_paused_ms`, `extended_seconds`) — every facilitator verb mutates these via the service-role client after an RLS-scoped authz read; participants observe via Realtime.
- `public.sessions.current_stage_id uuid` pointer with `ON DELETE SET NULL`.
- `public.stage_events` append-only audit table — `verb` CHECK accepts `start | pause | resume | extend | advance | rollback | reset`. INSERT policy requires `actor_profile_id = auth.uid()` AND the actor be the session's facilitator; SELECT for any org member; no UPDATE/DELETE policies (append-only at the RLS layer). Adding a new verb requires both a state-machine update (see [(authed)/CLAUDE.md "Stage controller + timer"](<../app/(authed)/CLAUDE.md>)) and a migration that drops + re-adds the CHECK with the expanded list (the pattern in `20260519000000_stage_events_reset_verb.sql`).
- `stages` + `sessions` are added to the `supabase_realtime` publication with `REPLICA IDENTITY FULL` so `postgres_changes` UPDATE payloads carry the full row through the participant's RLS filter. **Anything new that needs Realtime row-filtering on UPDATE must also set REPLICA IDENTITY FULL** — without it the OLD record is PK-only and RLS gates can't evaluate.
- Default per-stage durations come from `STAGE_DEFAULT_DURATIONS_SECONDS` in [lib/sessions/stage-labels.ts](../lib/sessions/stage-labels.ts), applied at `createSession` and `/api/test/seed-session` insert time. The backfill migration patched any pre-existing NULL rows once.

## Stage-import audit table (`model_imports`)

[migrations/20260519110000_model_imports.sql](migrations/20260519110000_model_imports.sql) backs the "Bring in my previous model" affordance (see [(authed)/CLAUDE.md "Bring in my previous model"](<../app/(authed)/CLAUDE.md>) for the full surface).

- One row per `(target_model_id, profile_id)` — the `model_imports_unique_target_profile` UNIQUE constraint is the database-layer gate against double-click races; the action surfaces a 23505 violation on shared_model as `already_imported`.
- FK choices follow the [collaborative-history pattern set in 20260516120000_profile_fk_set_null.sql](migrations/20260516120000_profile_fk_set_null.sql): `profile_id` and `source_model_id` are `on delete set null` so the audit trail survives author/source-model deletion; `target_model_id` cascades since the row is meaningless once the destination is gone. Both `set null` columns are therefore nullable.
- SELECT RLS via `is_org_member(s.org_id)` joined through `models → sessions` — any session-org member can read. No INSERT/UPDATE/DELETE policies — writes go through the service-role client in [bringInPreviousModel](<../app/(authed)/app/sessions/stage-import-actions.ts>) only, same defence-in-depth as `yjs_documents` and `model_versions`.
- Indexes: the unique constraint's composite btree on `(target_model_id, profile_id)` serves target-only queries via leftmost prefix; `model_imports_profile_idx` exists for "what did this user import across all targets" reverse lookups (not used yet, kept since adding it later requires a CONCURRENTLY index build).

## Out-of-band schema changes

If a migration's SQL has already been applied to the remote by hand (Dashboard SQL editor) before the file lands in `migrations/`, two follow-up rules to keep things consistent:

1. **Write the migration idempotently.** Guard every statement: `add column if not exists`, `insert ... on conflict (id) do nothing`, `drop policy if exists "<name>"` before each `create policy`. That way `pnpm db:push` against the already-migrated remote is a safe no-op AND `pnpm db:reset` on a fresh local replays cleanly. See [migrations/20260513100000_model_thumbnails.sql](migrations/20260513100000_model_thumbnails.sql) as the reference.
2. **Repair the migration history.** After committing the file, run once to record the migration as applied so future pushes skip it: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase migration repair --status applied <yyyymmddhhmmss> --linked`. The repair is the polite path; absence of it doesn't break correctness because the migration is idempotent.

## Supabase Storage conventions

The project uses two Supabase Storage buckets today: `model-thumbnails` (private, signed URLs — canvas previews on `/app/my-designs`) and `avatars` (public, direct URLs — profile pictures, see [app/(authed)/CLAUDE.md "Profile avatar"](<../app/(authed)/CLAUDE.md>)). The private/signed pattern is the default; only deviate to public when the content is inherently shareable across tenants (avatars). Both buckets share the owner-folder convention.

- **Default: private buckets, signed URLs.** `public = false` on the bucket; resolve URLs server-side with `supabase.storage.from('<bucket>').createSignedUrls(paths, 60 * 60)`. Use the plural `createSignedUrls()` (batched, one round-trip) on list pages, not the singular per row. Use this for any content that's tenant-private (designs, thumbnails, attachments).
- **Public bucket variant** — only for inherently-public content (e.g., avatars). `public = true` lets `supabase.storage.from('<bucket>').getPublicUrl(path)` return a directly-renderable URL with no signing. **Critical gotcha**: a public bucket also needs an explicit SELECT policy on `storage.objects` for `authenticated` if any code path calls `storage.upload(..., { upsert: true })`. The public flag only bypasses RLS for **unauthenticated** HTTP GET on the public URL — it does NOT satisfy the authenticated SELECT that the Supabase storage server issues internally to resolve INSERT-vs-UPDATE during upsert. Without the SELECT policy the upsert fails silently. See [migrations/20260517100000_avatars_bucket.sql](migrations/20260517100000_avatars_bucket.sql) for the canonical four-policy form (read + insert + update + delete).
- **Owner-folder paths.** Path convention `${auth.uid()}/<resource-id>.<ext>` so the Storage RLS policy `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership at the bucket level — symmetric with the row's `owner_profile_id = auth.uid()` RLS.
- **Verify ownership before uploading.** The Storage RLS only checks the path's user-folder; it doesn't know whether `<resource-id>` actually belongs to the user. Always SELECT the parent row through the user-scoped client first — otherwise a client can write orphan bytes at `${user.id}/<someone-elses-resource>.png`.
- **Magic-byte validation on user-supplied uploads.** `Content-Type` is client-set and trivially forged; a `image/png` Blob can wrap any bytes. For anything that gets rendered as `<img>` (thumbnails, avatars), validate the PNG signature on the server with [lib/images/validatePng.ts](../lib/images/validatePng.ts) `isPng()` AFTER the MIME and size checks. Without this, an attacker who has a valid session can write SVG-with-inline-script at the avatar URL.
- **Cache buster.** Append `?v=${updated_at}` (private bucket → on the signed URL with `&`) or `?v=${Date.now()}` (public bucket → on the public URL) so browsers don't serve stale images after an overwrite. Pair with `cacheControl: '0'` on `storage.upload` so the CDN doesn't override.
- **Plain `<img>` over `next/image`.** Avoids whitelisting the Supabase storage hostname in `next.config.mjs` and skips the optimisation pipeline cost on Railway. Suppress the `@next/next/no-img-element` warning with an inline `// eslint-disable-next-line` plus a rationale (see [../app/(authed)/app/my-designs/DesignList.tsx](<../app/(authed)/app/my-designs/DesignList.tsx>)) — or reuse the shared [`components/app/Avatar.tsx`](../components/app/Avatar.tsx) for profile pictures, which already encapsulates the suppression plus an `onError` fallback to an initials chip.
- **Hard-delete cleanup is the caller's job.** Deleting the row does NOT cascade to Storage. Server actions that hard-delete rows must explicitly `storage.from('<bucket>').remove([paths])` first. Cascade-via-FK doesn't exist for `storage.objects`. [lib/account/delete.ts](../lib/account/delete.ts) `performAccountDelete` is the reference for a multi-bucket sweep — it removes both `model-thumbnails/${userId}/*` and `avatars/${userId}/avatar.png` before calling `auth.admin.deleteUser`.

## Auth providers

The sign-in page ([../app/sign-in/page.tsx](../app/sign-in/page.tsx)) supports magic link and Google OAuth. Post-sign-in destination is `/app/my-designs` — defaulted in three places ([../app/sign-in/actions.ts](../app/sign-in/actions.ts), [../app/sign-in/page.tsx](../app/sign-in/page.tsx), [../app/auth/callback/route.ts](../app/auth/callback/route.ts)); change all three together.

- **Google OAuth (primary tested path).** Configured in Supabase Dashboard → Authentication → Providers → Google. The OAuth client lives in a Google Cloud project under the maintainer's account; redirect URI in Google **must** match `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` exactly. Published 2026-05-15 — out of Testing mode, any Google account can sign in. Branding (privacy / terms links) lives on the OAuth consent screen.
- **Magic link.** Transports through Resend SMTP via Supabase Auth's custom-SMTP bridge. From: `hello@brickthink.io`; sending domain `brickthink.io` is verified in Resend with SPF / DKIM / DMARC records on Namecheap. Reply-To surfaces in the email footer (the Supabase SMTP bridge doesn't pass a Reply-To header through, so it's an inline `mailto:` instead). The `RESEND_API_KEY` / `RESEND_FROM_ADDRESS` entries in [../.env.example](../.env.example) are documentation reminders only — Next.js doesn't read them; the source of truth for the SMTP password is the Supabase Dashboard. Resend free tier allows 100 sends / day with no per-recipient throttle (the prior ~4/hour built-in-email limit is gone). Local dev still uses Inbucket (`http://127.0.0.1:54324`) — deliberately not pointed at Resend to avoid burning free-tier sends and to keep `pnpm db:reset` cycles fast.
- **Redirect URLs allowlist.** Supabase falls back to Site URL and drops the `?next=` query param if `/auth/callback` isn't whitelisted under URL Configuration. As a defensive net, [../app/page.tsx](../app/page.tsx) forwards any stray `?code=` on `/` to `/auth/callback?...&next=/app/my-designs`. Don't remove the forwarder without confirming the allowlist covers wildcard query strings (`http://localhost:3000/**` or equivalent).

## Local-stack gotchas

### Kong stale-upstream after `pnpm db:reset`

Local Supabase runs `kong` as the API gateway in front of `gotrue` (auth), `postgrest`, etc. Kong resolves each upstream's container IP at startup. `pnpm db:reset` restarts the auth container, which gets a new Docker IP — but Kong's resolved upstream still points at the old (now-dead) IP. Symptom: any call through `/auth/v1/...` returns `502 An invalid response was received from the upstream server`, often surfacing in the UI as a serialised empty-object `{}` error message because some Supabase JS clients lose the upstream's message in serialisation.

Fix: `docker restart supabase_kong_brick_think` to force Kong to re-resolve upstreams. Takes ~2 seconds. Alternatively `pnpm db:stop && pnpm db:start` restarts everything cleanly.

### Magic-link PKCE: localhost vs 127.0.0.1 host pinning

Symptom while running `pnpm dev:e2e` (or `pnpm dev`): you submit the magic-link form, click the link in Mailpit, and the sign-in page comes back with **"PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared…"**.

Cause: PKCE is host-pinned. The verifier cookie is set during the `sendMagicLink` server action ([../app/sign-in/actions.ts](../app/sign-in/actions.ts)) on whichever hostname the browser used. The callback ([../app/auth/callback/route.ts](../app/auth/callback/route.ts)) only finds that cookie if you land back on the same hostname. Local Supabase's [config.toml](config.toml) ships with `site_url = "http://localhost:3000"` and an allowlist scoped to `localhost:3000` only — so if you initiated the flow on `http://127.0.0.1:3000`, GoTrue ignores `127.0.0.1` in `emailRedirectTo`, falls back to `site_url`, and the callback runs on `localhost` with no matching cookie. Same failure mode if you click the email link in a different browser/profile from where you started.

Fix, easiest first:

1. **Always open the app at `http://localhost:3000` exactly** (not `127.0.0.1:3000`) and click the link in the same browser profile. This is the canonical path.
2. Don't run `pnpm dev` and `pnpm dev:e2e` concurrently — they share port 3000 and `.next/` and corrupt each other's auth cookies (project ref differs between local and remote Supabase, so cookies don't carry over either).
3. If you previously signed in against the remote project on `localhost`, clear site data for `localhost:3000` once when switching to `pnpm dev:e2e` — the stale remote-project cookie can shadow the local one.
4. Only widen the allowlist if you genuinely need both hosts to work locally. Add `"http://127.0.0.1:3000/**"` (and the wildcard form of localhost) to `additional_redirect_urls` in [config.toml](config.toml), then `pnpm db:stop && pnpm db:start` so GoTrue re-reads it. Don't ship this change unless there's a reason — keeping the surface tight is the point.
