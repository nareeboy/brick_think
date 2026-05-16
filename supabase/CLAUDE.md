# Supabase — local stack, migrations, Storage, auth

Scope: anything that touches `supabase/migrations/`, `supabase/config.toml`, RLS policies, Storage buckets, or the auth flow. The root [CLAUDE.md](../CLAUDE.md) carries the hard rule that `pnpm db:push` is never autonomous — that rule applies everywhere, repeated there so frontend work also sees it.

## Local stack and remote project

- Local stack: `pnpm db:start` / `db:reset` (Docker via OrbStack, see `pnpm db:status` for ports).
- Remote project: `wreypwrvfpzjyijpyhkb` (set in `.env.local` `NEXT_PUBLIC_SUPABASE_URL`).
- Schema lives in [migrations/](migrations/); never apply DDL outside a migration on the local stack.
- Remote pushes go via `pnpm db:link` / `db:push` (these scripts inline-load `SUPABASE_ACCESS_TOKEN` from `.env.local` because the machine's shared `supabase login` is on a different account). If a `supabase` subcommand isn't covered by an npm script, prefix it manually: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase <cmd> --linked`.

## Out-of-band schema changes

If a migration's SQL has already been applied to the remote by hand (Dashboard SQL editor) before the file lands in `migrations/`, two follow-up rules to keep things consistent:

1. **Write the migration idempotently.** Guard every statement: `add column if not exists`, `insert ... on conflict (id) do nothing`, `drop policy if exists "<name>"` before each `create policy`. That way `pnpm db:push` against the already-migrated remote is a safe no-op AND `pnpm db:reset` on a fresh local replays cleanly. See [migrations/20260513100000_model_thumbnails.sql](migrations/20260513100000_model_thumbnails.sql) as the reference.
2. **Repair the migration history.** After committing the file, run once to record the migration as applied so future pushes skip it: `SUPABASE_ACCESS_TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2-) pnpm exec supabase migration repair --status applied <yyyymmddhhmmss> --linked`. The repair is the polite path; absence of it doesn't break correctness because the migration is idempotent.

## Supabase Storage conventions

The project uses Supabase Storage for the `model-thumbnails` bucket (canvas previews on `/app/my-designs`). Future buckets (user avatars, attachments, org-shared thumbnails) should follow the same pattern unless there's a specific reason not to:

- **Private buckets, signed URLs.** `public = false` on the bucket; resolve URLs server-side with `supabase.storage.from('<bucket>').createSignedUrls(paths, 60 * 60)`. Use the plural `createSignedUrls()` (batched, one round-trip) on list pages, not the singular per row.
- **Owner-folder paths.** Path convention `${auth.uid()}/<resource-id>.<ext>` so the Storage RLS policy `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership at the bucket level — symmetric with the row's `owner_profile_id = auth.uid()` RLS.
- **Verify ownership before uploading.** The Storage RLS only checks the path's user-folder; it doesn't know whether `<resource-id>` actually belongs to the user. Always SELECT the parent row through the user-scoped client first — otherwise a client can write orphan bytes at `${user.id}/<someone-elses-resource>.png`.
- **Cache buster on signed URLs.** Append `&v=${updated_at}` (or another monotonic field) to the signed URL. Supabase signed URLs are deterministic for a given `(path, expiresIn)` within the TTL — without a buster, browsers cache stale images after an overwrite.
- **Plain `<img>` over `next/image`.** Avoids whitelisting the Supabase storage hostname in `next.config.mjs` and skips the optimisation pipeline cost on Railway. Suppress the `@next/next/no-img-element` warning with an inline `// eslint-disable-next-line` plus a rationale (see [../app/(authed)/app/my-designs/DesignList.tsx](<../app/(authed)/app/my-designs/DesignList.tsx>)).
- **Hard-delete cleanup is the caller's job.** Deleting the row does NOT cascade to Storage. Server actions that hard-delete rows must explicitly `storage.from('<bucket>').remove([paths])` first. Cascade-via-FK doesn't exist for `storage.objects`.

## Auth providers

The sign-in page ([../app/sign-in/page.tsx](../app/sign-in/page.tsx)) supports magic link and Google OAuth. Post-sign-in destination is `/app/my-designs` — defaulted in three places ([../app/sign-in/actions.ts](../app/sign-in/actions.ts), [../app/sign-in/page.tsx](../app/sign-in/page.tsx), [../app/auth/callback/route.ts](../app/auth/callback/route.ts)); change all three together.

- **Google OAuth (primary tested path).** Configured in Supabase Dashboard → Authentication → Providers → Google. The OAuth client lives in Google Cloud project `brickthink-auth`; redirect URI in Google **must** match `https://wreypwrvfpzjyijpyhkb.supabase.co/auth/v1/callback` exactly. Published 2026-05-15 — out of Testing mode, any Google account can sign in. Branding (privacy / terms links) lives on the OAuth consent screen.
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
