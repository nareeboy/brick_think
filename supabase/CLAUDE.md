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


## session_participants + session_invitations + join_code

[migrations/20260520020000_session_participants.sql](migrations/20260520020000_session_participants.sql) and follow-ups introduce the join-code accept flow and facilitator-managed roster for session-level participant discovery.

- `public.session_participants(session_id, profile_id)` — composite PK, one row per session-participant pair. Columns: `joined_at` (non-null), `removed_at` (soft-delete, nullable), `spotlighted_at` (Realtime tie for the banner, nullable). Org-member-scoped SELECT; service-role INSERT/UPDATE.
- `public.session_invitations(id, session_id, email, code)` — mirrors `org_invitations` shape for email-based invites. `code` is the magic-link token minted by Supabase Auth; `claimed_at` (nullable) gates whether an invite was accepted via the auth callback. RLS: org-member-scoped SELECT; service-role INSERT/UPDATE. The `handle_new_user` trigger ([migrations/20260520010000_handle_new_user_upsert_invitations.sql](migrations/20260520010000_handle_new_user_upsert_invitations.sql)) also handles session invitations with `on conflict (session_id, email) do update` to auto-restore previously-kicked users when the facilitator re-invites them.
- `public.sessions.join_code` (text, 6-char, nullable) — set on create via `generate_join_code()` SQL function (Crockford base32 alphabet to avoid confusion). Rotatable via `rotateJoinCodeAction`; the old code is wiped when a new one is generated. Only set on org-scoped sessions (`sessions.org_id NOT NULL`).
- `public.generate_join_code()` — service-role-only SQL function. Generates unique 6-char codes; called on `createSession` and `rotateJoinCodeAction`.
- `public.lookup_session_by_code(p_code)` — security-definer RPC, granted to `anon` and `authenticated`. Takes a join code, returns the session ID + org name + facilitator name (the fields needed for UX on the public `/app/join/[code]` page). Unauth-safe; returns `NULL` if the code doesn't match.
- `public.is_session_participant(p_session_id)` — plpgsql security-definer helper. Returns `true` if the caller is in `session_participants` for that session, `false` otherwise. Used by the RLS extension (see below).
- `public.is_session_participant_for(p_profile_id, p_session_id)` — plpgsql variant. Used by the `handle_new_user` trigger to check membership when processing claims.
- `public.can_see_profile_via_session(p_profile_id, p_requester_id)` — plpgsql security-definer RPC. Returns `true` if `p_requester_id` is a session-participant with the same session as `p_profile_id`, OR if they're org-members together. Used by the `profiles` SELECT policy so non-org-members can see participant names on the session page.

**RLS extension pattern**: every SELECT policy on `sessions`, `stages`, `stage_rooms`, `stage_room_members`, `stage_room_sources`, and the `can_read_model` RPC gains a parallel `is_session_participant(session_id)` OR-branch so session-participants see the data regardless of org membership. The `models` SELECT also extends — service-role read in design pages, participant sees their own model + room-composed models if Yjs is on. Example: a pre-existing `(auth.uid() = s.owner_profile_id OR is_org_member(s.org_id))` becomes `(... OR is_session_participant(s.id))`. All new session-related tables and their FKs are scoped through this extension so the participant-only path keeps working.

- Backfill: existing `session_participants` rows were created for sessions with `join_code` set via [migrations/20260520030000_backfill_session_participants.sql](migrations/20260520030000_backfill_session_participants.sql), which inserted one row per (session, org-member) pair so legacy sessions keep the "all org members join" semantics when rooms are enabled.

**Notifications** — new `notifications.kind` values ([migrations/20260520040000_notification_kinds_session.sql](migrations/20260520040000_notification_kinds_session.sql)):

- `participant_joined` — fired by `redeemJoinCodeAction` when a new participant joins (the facilitator is notified).
- `session_invitation_claimed` — fired by the auth callback when someone clicks a magic-link in a session invite email and claims the code.
## Stage rooms data model

[migrations/20260519130000_stage_rooms.sql](migrations/20260519130000_stage_rooms.sql) introduces breakout-group rooms on `shared_model`, `system_model`, and `guiding_principles`. The full UI / server-action surface is documented in [(authed)/CLAUDE.md "Stage rooms (breakout groups)"](<../app/(authed)/CLAUDE.md>); this section covers the schema invariants only.

- `public.stage_rooms` — `(id, stage_id, position, title, created_at)`. Unique on `(stage_id, position)` AND composite-unique on `(id, stage_id)` so child FKs can pin a room's stage at the constraint layer (used by `stage_room_members` to enforce mutual-exclusion-per-stage through the `(stage_id, profile_id)` unique index).
- `public.stage_room_members` — `(room_id, stage_id, profile_id)`. `shared_model` rooms only — populated by `setSharedModelRooms` via service role.
- `public.stage_room_sources` — `(room_id, source_room_id)`. `system_model` and `guiding_principles` rooms only — populated by `setDownstreamStageRooms`. The "source room must live on the immediately-preceding stage in `IMPORT_RULES`" rule is enforced by the server action, not the DB.
- `public.models.room_id` — nullable FK to `stage_rooms` (`on delete cascade`). The 1-1 between rooms and canvases is enforced by `models_room_uniq` (partial unique on `room_id is not null`). The legacy `models_session_stage_owner_active_idx` was rebuilt with `room_id is null` in its predicate so per-owner uniqueness on personal canvases survives alongside the new "facilitator can own many room canvases per stage" reality.
- `public.can_edit_room(p_profile_id uuid, p_model_id uuid) → boolean` — service-role-only recursive SQL function. Walks `stage_room_sources` from the room linked to the model, back to whatever `shared_model` room the chain bottoms out at, then checks membership against `stage_room_members`. This is the single source of truth for "is this user a transitive member of that room?"; both the design page (liveMode gate) and the Yjs worker (WS upgrade gate) call it. Returns `false` for non-room models.
- All three tables are added to `supabase_realtime` with `REPLICA IDENTITY FULL` so participants see facilitator partitioning land live without a refresh. No INSERT / UPDATE / DELETE RLS policies — writes flow through service-role server actions only (defence-in-depth pattern mirroring `model_imports`, `yjs_documents`, `model_versions`). SELECT is open to any session-org member.
- Backfill: every pre-existing `shared_model` model becomes Room 1 on its stage with every session-org member enrolled. The migration is idempotent — re-running `pnpm db:reset` or applying out-of-band against an already-migrated remote is a no-op past the first apply.

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

The project uses three Supabase Storage buckets today: `model-thumbnails` (private, signed URLs — canvas previews on `/app/my-designs`), `avatars` (public, direct URLs — profile pictures, see [app/(authed)/CLAUDE.md "Profile avatar"](<../app/(authed)/CLAUDE.md>)), and `session-reports` (private, signed URLs — generated PDFs, see "Session reports" below). The private/signed pattern is the default; only deviate to public when the content is inherently shareable across tenants (avatars). All three buckets share the owner-folder convention (the `session-reports` variant uses an `${org_id}/${session_id}/` prefix instead).

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

## `sessions.pre_session_check` schema

Added 2026-05-19 ([migrations/20260519150000_session_prep_columns.sql](migrations/20260519150000_session_prep_columns.sql)). `jsonb not null default '{}'::jsonb`. Stores explicit facilitator acknowledgments for the pre-session checklist (PRD §5.3).

**Whitelisted keys** — enforced by `updatePreSessionCheckAction` in [../app/(authed)/app/sessions/scenario-actions.ts](../app/\(authed\)/app/sessions/scenario-actions.ts), not at the DB layer. The runtime allowlist lives in [../lib/sessions/preSessionCheck.ts](../lib/sessions/preSessionCheck.ts) so the action file can stay async-only (Next.js `'use server'` disallows non-async exports).

- `a11y_reviewed: boolean` — facilitator confirms they reviewed their accessibility preferences before the workshop.

**Phase 2 keys (planned)**:

- `consent_collected: boolean` — recording / story-capture consent confirmed by all participants.

When adding a key: extend `ALLOWED_PRE_SESSION_KEYS` in `lib/sessions/preSessionCheck.ts`, add a row above, and update the matching ChecklistRow in [`PreSessionChecklist.tsx`](../app/\(authed\)/app/sessions/[id]/PreSessionChecklist.tsx). DB-level type checks are intentionally deferred — `jsonb` keeps the bag forward-compatible without per-key migrations.

## `sessions.facilitator_notes` privacy

Single `text` column on `sessions` (`null`able, CHECK `char_length ≤ 8000`) added in [migrations/20260520210000_sessions_facilitator_notes.sql](migrations/20260520210000_sessions_facilitator_notes.sql). Stores the facilitator's private working notes per session. UI surface (collapsible session-page card + canvas-chrome drawer on session-scoped designs) is documented in [../app/(authed)/CLAUDE.md "Facilitator notes"](<../app/(authed)/CLAUDE.md>); this section covers the privacy invariant only.

**Privacy is enforced at the data-access layer, not by RLS.** The existing `sessions` SELECT policy grants any org member the ability to read the row (org members need to see session title / status / current_stage_id to render the page); Postgres can't gate column visibility row-by-row through `select *`. Instead:

- The single read helper [`getFacilitatorNotes(sessionId)`](../lib/sessions/facilitatorNotes.ts) is the **only** function in the codebase that projects `facilitator_notes` from `sessions`. It uses the service-role client, re-asserts `data.facilitator_id === user.id`, and returns `null` for any non-facilitator caller — including org owners and admins.
- The write path is the equally narrow [`updateFacilitatorNotesAction`](../app/\(authed\)/app/sessions/notes-actions.ts) which re-asserts the same facilitator gate before UPDATE.
- A source-grep invariant in [tests/integration/facilitator-notes-isolation.integration.test.ts](../tests/integration/facilitator-notes-isolation.integration.test.ts) walks the repo and asserts that only a small allowlist of files (the helper, the action, `NotesEditor`, and the two surface components) references the `facilitator_notes` literal. If you add a new caller that needs notes, route it through `getFacilitatorNotes` rather than reintroducing the column on a generic `.select()` call — and **never `select('*')` on `sessions`**, the column would tag along (and the source-grep doesn't catch `'*'` directly, so this is on you).

The 8000-char CHECK matches the client `maxLength` in [NotesEditor.tsx](../components/session/NotesEditor.tsx) / [lib/sessions/facilitatorNotesConstants.ts](../lib/sessions/facilitatorNotesConstants.ts) — if you raise one, raise both (and add a migration that drops + re-adds the CHECK with the new cap).

## `scenarios` table

Added 2026-05-19 ([migrations/20260519140000_scenarios.sql](migrations/20260519140000_scenarios.sql), seeds in `20260519160000_scenarios_seed.sql`). 20 canonical Phase-1 templates (4 per stage_type) seeded via service-role migration; no INSERT/UPDATE/DELETE RLS policies yet (Phase 2 will add org-scoped custom authoring). The TS source of truth that the seed migration mirrors lives in [../lib/scenarios/canonical.ts](../lib/scenarios/canonical.ts); a unit test reads both files and asserts row counts match.

SELECT policy: any authenticated user sees `is_template = true` rows plus rows where they're a member of `org_id`. Check constraint `scenarios_template_global_chk` enforces `is_template ⇒ org_id IS NULL`.

`stages.scenario_id` is the per-stage pick (nullable, `ON DELETE SET NULL` so removing a template doesn't break historic sessions). Written by `setStageScenarioAction` under the existing facilitator gate.

## Per-stage scenario overrides

Two nullable text columns on `stages` let facilitators tailor the canonical prompt for their session without forking the seed row. When either is set, the stage-card scenario panel shows a `customised` chip and renders the override; clearing either falls back to the canonical `scenarios.title` / `scenarios.body`.

- `stages.scenario_title_override text` (CHECK ≤ 120) — added [migrations/20260520140000_stage_scenario_title_override.sql](migrations/20260520140000_stage_scenario_title_override.sql).
- `stages.scenario_body_override text` (CHECK ≤ 4000) — added [migrations/20260520120000_stage_scenario_body_override.sql](migrations/20260520120000_stage_scenario_body_override.sql).

Both written atomically by `updateStageScenarioOverridesAction({ title, body })` in [../app/(authed)/app/sessions/scenario-actions.ts](../app/\(authed\)/app/sessions/scenario-actions.ts). The action normalises empty / whitespace / canonical-matching inputs to `NULL` so the override only persists when the facilitator's text genuinely differs from the seed.

## Session reports (PDF generation)

After a session ends, the facilitator can generate a branded PDF report on `/app/sessions/<id>` via the `Generate report` button. The pipeline (server action `generateSessionReport` in [../app/(authed)/app/sessions/report-actions.ts](../app/\(authed\)/app/sessions/report-actions.ts)) collects all `models` rows for the session grouped by stage, calls Anthropic Sonnet 4.6 for an exec-summary + per-model descriptions + closing synthesis, renders to PDF via `@react-pdf/renderer` using the brand stylesheet in [../lib/reports/pdf/](../lib/reports/pdf/), uploads to Storage, and returns a 1h signed URL.

**`public.session_reports`** ([migrations/20260520151000_session_reports.sql](migrations/20260520151000_session_reports.sql)) tracks one row per session with PK `session_id`. Columns: `generation_status` (`pending`/`succeeded`/`failed`), `claude_model`, `pdf_path` (Storage path), `error_code`/`error_message` for failed runs, `included_artifacts jsonb` (forward-compatible manifest — currently `{ models: [], recordings: [], prompts: [] }` so adding recordings/prompts later doesn't require a column migration), `generated_at`, `generated_by` (`profiles.id`, **nullable** with `ON DELETE SET NULL` so the row survives account deletion — see [migrations/20260516120000_profile_fk_set_null.sql](migrations/20260516120000_profile_fk_set_null.sql) for the convention). PK on `session_id` means **regenerate overwrites**: there's no history of past reports, just the latest. RLS: facilitator-of-session reads; service-role writes.

**`session-reports` Storage bucket** ([migrations/20260520152000_session_reports_storage.sql](migrations/20260520152000_session_reports_storage.sql)) is **private with zero per-bucket policies**, which means default-deny: `storage.objects` has RLS enabled and no permissive policy matches `bucket_id = 'session-reports'`, so authenticated clients can't read or write. Service role bypasses RLS so the server action can upload + sign URLs. Path convention `${org_id}/${session_id}/${ts}.pdf`; old timestamps are deleted before a regenerate uploads the new one (so storage stays at one PDF per session).

The action runs synchronously inside the Next.js request (10–90s typical). Anthropic is called with a 90s timeout in [../lib/reports/synthesize.ts](../lib/reports/synthesize.ts) so a hung upstream can't hang the user's browser indefinitely.

## BYO Anthropic key (`user_integrations`)

Per-user Anthropic API key for the report-generation pipeline. Each facilitator pastes their own `sk-ant-…` on [`/app/account`](../app/\(authed\)/app/account/page.tsx) via the IntegrationsCard; the action stores it encrypted under the server-only env var `BRICKTHINK_ENCRYPTION_KEY` (32-byte hex, AES-256-GCM with random 12-byte nonce per row).

Two storage gotchas the codebase has been bitten by — keep these in mind for any future encrypted-blob column:

- **Use `text` columns, not `bytea`, for ciphertext + nonce.** The original schema used `bytea` and supabase-js JSON-serialised the `Buffer` values as `{"type":"Buffer","data":[…]}` which got stored as raw ASCII in the bytea column. Decrypt then silently failed on read. Fixed in [migrations/20260520170000_user_integrations_text_columns.sql](migrations/20260520170000_user_integrations_text_columns.sql) by switching to text columns storing base64. Encode at the supabase-js boundary with `Buffer.toString('base64')` on write, `Buffer.from(str, 'base64')` on read.
- **Surface `decrypt_failed` separately from `no_claude_key`** in any caller. Collapsing both into "no key" hides the real failure mode (almost always: `BRICKTHINK_ENCRYPTION_KEY` rotated between save and read). See `GenerateReportResult` in [../app/(authed)/app/sessions/report-actions.ts](../app/\(authed\)/app/sessions/report-actions.ts).

RLS: a user can read/write their own `user_integrations` row only (`profile_id = auth.uid()`). Service-role bypass is used by the report action's lookup (`getAnthropicClientForProfile` in [../lib/integrations/anthropic.ts](../lib/integrations/anthropic.ts)) — the plaintext key is constructed only there and never logged.

`profile_id` cascades on `profiles` delete, so account deletion sweeps the encrypted blob cleanly.
