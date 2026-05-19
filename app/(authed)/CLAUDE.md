# UI conventions — authed app

Scope: pages under `app/(authed)/`. The nav IA, modal shape, badge pills, and hover-revealed actions described here are repeated across the authed surface; keep new pages consistent unless there's a deliberate reason to diverge.

## Navigation hierarchy: Organisations → Sessions → Designs

The app's IA is a single hierarchy with one cross-cutting index. Context comes from the URL on each page — there is no global "active org" state on the profile, no header switcher. The header has exactly two top-level nav links — `Organisations` and `My Designs` — plus a user block on the right: the user's avatar + display name (purely visual, not a click target), an icon-only cog linking to [`/app/account`](app/account/page.tsx), and the Sign-out form. The cog is the canonical entry point to per-account settings; the avatar and name reinforce identity but never duplicate navigation.

- **`/app/my-designs`** ([app/my-designs/page.tsx](app/my-designs/page.tsx)) is the aggregate index of every design the signed-in user has authored (`owner_profile_id = me`), regardless of where it lives. Each card carries a badge: `Personal` (model has no session/org) or `{Org} · {Session}` (session-scoped). The page-level Filter dropdown narrows by Personal or by a specific org via `?filter=personal|org-<uuid>`; the URL is the source of truth (see [../../lib/my-designs/types.ts](../../lib/my-designs/types.ts) `parseFilter` / `serializeFilter`).
- **`/app/orgs`** lists the orgs you're a member of; clicking one navigates to **`/app/orgs/[id]`** which shows that org's sessions list (primary content), member roster, and admin actions. Sessions list is the default surface — no separate `/app/orgs/[id]/sessions` route. The header carries the action group on the right: leave (icon), delete (icon, owner-only), and `Create session` (primary). Creating a session and adding a member both happen in modal dialogs ([app/orgs/[id]/sessions/NewSessionDialog.tsx](app/orgs/[id]/sessions/NewSessionDialog.tsx), [app/orgs/[id]/AddMemberDialog.tsx](app/orgs/[id]/AddMemberDialog.tsx)) — no inline forms on the page.
- **`/app/sessions/[id]`** is the session detail page. Its eyebrow renders a breadcrumb `Organisations / {Org} / Session · {status}` linking back through the hierarchy. The unified [SessionStages](app/sessions/[id]/SessionStages.tsx) client component owns the entire stage list — it merges what was historically split between `SessionStageList` (model surface) and `StageControllerContainer` (timer controls). Each stage row carries: the canonical / overridden label via [StageMetaEditor](app/sessions/[id]/StageMetaEditor.tsx) (per-session overrides on the nullable `stages.title` / `stages.description` columns from [migrations/20260517000000_stage_overrides.sql](../../supabase/migrations/20260517000000_stage_overrides.sql), edited via `updateStageMeta` in [app/sessions/actions.ts](app/sessions/actions.ts)); the runtime status pill (`pending` / `active` / `paused` / `completed`) with a coloured dot; the editable per-stage duration (see "Stage controller + timer" below); and either the model action row or the dashed-border "Stage timer" cluster depending on facilitator-vs-participant view. The facilitator-only "Session settings" panel (status / mode / scheduled-for) lives in [SessionMetaForm](app/sessions/[id]/SessionMetaForm.tsx) and the `updateSessionMeta` action — both intact, both real columns on `sessions`, but **not currently rendered**: nothing in the app branches on those fields yet, so the editor would be misleading. Re-import the component on [page.tsx](app/sessions/[id]/page.tsx) when status / mode / scheduled-for actually drive behaviour (async-mode UX, scheduling, etc.).
- Sessions are **always org-scoped** (`sessions.org_id NOT NULL`). Designs in the org case are **always session-scoped**: a model has either `(org_id IS NULL AND session_id IS NULL)` for Personal, or `(org_id IS NULL AND session_id IS NOT NULL)` for session-scoped — the `models_context_exclusive` CHECK forbids both being set. The legacy "org-standalone" state (`org_id` set, `session_id` null) was migrated away in [../../supabase/migrations/20260515000000_nav_restructure.sql](../../supabase/migrations/20260515000000_nav_restructure.sql).
- **`/app/account`** ([app/account/page.tsx](app/account/page.tsx)) is a stacked settings hub — profile form ([AccountForm](app/account/AccountForm.tsx)) with avatar control row + display name, the replay walkthrough card ([ReplayWalkthroughCard](app/account/ReplayWalkthroughCard.tsx)), the accessibility preferences card ([A11yPreferencesCard](app/account/A11yPreferencesCard.tsx) — toggles `profiles.a11y_preferences.colourblindMode` via [`updateA11yPreferencesAction`](app/account/actions.ts); the toggle drives [BrickPatternOverlay](../../components/builder/BrickPatternOverlay.tsx) rendering on every placed brick), the open-source contribution card ([ContributionCard](app/account/ContributionCard.tsx) linking to the GitHub repo and issues tracker), then a danger zone with delete-account ([DangerZone](app/account/DangerZone.tsx) → `deleteAccountAction` in [actions.ts](app/account/actions.ts), with pre-flight checks in [../../lib/account/delete.ts](../../lib/account/delete.ts)). BrickThink is open source (Apache 2.0); the prior Stripe/billing scaffolding (`BillingCard`, `/api/billing/*`, `/api/stripe/webhook`, `lib/billing/*`, `plans` / `stripe_customers` / `stripe_subscriptions` tables) was removed in the open-source flip — don't reintroduce it without an explicit decision to monetise. Delete-account refuses while the user is sole owner of an org with other members, auto-deletes sole-owner empty orgs, sweeps both the `model-thumbnails/${userId}/*` prefix and `avatars/${userId}/avatar.png`, then calls `auth.admin.deleteUser`. The flow only works because [supabase/migrations/20260516120000_profile_fk_set_null.sql](../../supabase/migrations/20260516120000_profile_fk_set_null.sql) flipped `model_versions.created_by` and `sessions.facilitator_id` to `ON DELETE SET NULL` (the NO-ACTION FKs blocked the auth delete before).

## First-login walkthrough

A two-branch onboarding overlay lives under [`components/onboarding/`](../components/onboarding/) — state is purely localStorage; **no DB migrations, no server actions, no API routes**.

- **Hook** [useOnboardingState](../../components/onboarding/useOnboardingState.ts) is SSR-safe (returns `'facilitator'` + all flags `false` until `hydrated` flips on the client). Components must gate UI on `hydrated` to avoid a first-paint flash. Subscribes to cross-tab `storage` events so flipping a flag in tab A updates tab B.
- **Five localStorage keys**, all under the `bt_` prefix: `bt_onboarding_role` (`'facilitator'` | `'participant'`, default `'facilitator'`), `bt_welcome_seen`, `bt_checklist_dismissed`, `bt_checklist_complete` (set when the user reaches all-done so the completion banner survives one full visit before auto-dismissing next reload), `bt_session_tour_seen`. `replayAll()` clears everything except role.
- **Facilitator branch** (every user without an explicit `'participant'` role): [WelcomeModal](../../components/onboarding/WelcomeModal.tsx) on first `/app/my-designs` visit → [FacilitatorChecklist](../../components/onboarding/FacilitatorChecklist.tsx) pinned above the existing header, with three steps whose done-state is computed server-side from the page's existing data (orgs / sessions / owned session-scoped designs) → [SpotlightTour](../../components/onboarding/SpotlightTour.tsx) (3 steps, custom SVG cut-out overlay, no library) on first session-page visit.
- **Participant branch** (inert until a future invite-accept route writes `bt_onboarding_role = 'participant'`): [ParticipantCoachMark](../../components/onboarding/ParticipantCoachMark.tsx) — single tooltip on the first session page visit.
- **Replay** lives on `/app/account` as [ReplayWalkthroughCard](app/account/ReplayWalkthroughCard.tsx) between the profile form and the [A11yPreferencesCard](app/account/A11yPreferencesCard.tsx). Clears flags and bounces to `/app/my-designs`.

Tour targets are identified by `data-tour-id` attributes on the session page: `session-header` (the `<header>`), `first-stage-card` (first `<li>` in [SessionStages](app/sessions/[id]/SessionStages.tsx)), `stage-meta-pencil` (first stage's editor button — passed via a new `isTourTarget` prop on [StageMetaEditor](app/sessions/[id]/StageMetaEditor.tsx)). The spotlight silent-skips any step whose target isn't in the DOM, so non-managers (no pencil) collapse the tour to 2 steps automatically.

E2E specs that use `signedInPage` get a fresh user per test — without suppression, every spec would hit the welcome modal on first navigation. The fixture pre-sets `bt_welcome_seen` / `bt_checklist_dismissed` / `bt_session_tour_seen` via `addInitScript` so unrelated specs see "returning user" UI. The onboarding spec ([e2e/onboarding-walkthrough.spec.ts](../../e2e/onboarding-walkthrough.spec.ts)) overrides this in `beforeEach`. See [e2e/CLAUDE.md](../../e2e/CLAUDE.md) for details.

## Profile avatar

`profiles.avatar_url` (init migration, populated from OAuth metadata on sign-up) is now writeable by users via `/app/account`. One shared rendering primitive, one canonical upload surface, three display surfaces.

- **Shared component** [`components/app/Avatar.tsx`](../../components/app/Avatar.tsx) is the only renderer. Four size variants — `sm` (`h-8 w-8`, header chip), `md` (`h-16 w-16`, page heading), `lg` (`h-11 w-11`, member row), `xl` (`h-20 w-20`, account settings). `'use client'` so the `<img>` can `onError` → fall back to the initials chip. Initials use `name.charAt(0).toUpperCase()`; whitespace-only `name` renders `?`. Pure display — never wrap in a `<Link>`.
- **Upload entry point is `/app/account` only.** Avatars rendered elsewhere are display-only. [AccountForm](app/account/AccountForm.tsx) opens [AvatarUploadDialog](app/account/AvatarUploadDialog.tsx) which wraps `react-easy-crop` (round mask, `aspect=1`, zoom 1–3×), rasterises a 256×256 PNG via `<canvas>`, and POSTs to [`updateAvatarAction`](app/account/actions.ts). Removal is an inline confirm row (no separate modal). The dialog wraps [ModalBackdrop](../../components/app/ModalBackdrop.tsx) and focuses the drop-zone (or close button when cropping) on open per the modal a11y convention above.
- **Server-side validation chain** in [`updateAvatarAction`](app/account/actions.ts): `Blob` instance → MIME == `image/png` → 0 < size ≤ 100 KB → `isPng` magic-byte check ([lib/images/validatePng.ts](../../lib/images/validatePng.ts)). The magic-byte check is critical — without it a client can spoof `Content-Type: image/png` on an SVG with inline script. Same validator the thumbnail route uses.
- **Public bucket + cache-busted URL.** Storage bucket is `avatars`, `public: true`, path `<auth.uid()>/avatar.png` (one object per user, upserted). The action returns the public URL with `?v=${Date.now()}` appended; that exact string lands in `profiles.avatar_url` and is what every consumer renders. Storage upload uses `cacheControl: '0'` so the CDN doesn't override the cache buster. See [supabase/CLAUDE.md](../../supabase/CLAUDE.md) for the SELECT-policy-on-upsert gotcha.
- **Three display surfaces, fetched server-side per render**: the global header ([app/(authed)/app/layout.tsx](app/layout.tsx) pulls `avatar_url` into the existing profile fetch and passes it to [GlobalHeader](../../components/app/GlobalHeader.tsx) — sm size, sits before the cog), the My Designs page heading ([app/my-designs/page.tsx](app/my-designs/page.tsx) — md size, left of the H1), and the existing org member row ([app/orgs/[id]/MemberRow.tsx](app/orgs/[id]/MemberRow.tsx) — lg size). All three use the shared component; the local copy that used to live in `MemberRow.tsx` was removed during the refactor.
- **Revalidation set**: `updateAvatarAction` and `removeAvatarAction` both call `revalidatePath('/app/account')`, `revalidatePath('/app/my-designs')`, `revalidatePath('/app/orgs')` after a successful mutation. Same set `updateProfileAction` uses — keep them aligned when adding new mutations.
- **OAuth-seeded URLs are left alone.** Some Google-sign-in users have `avatar_url` pointing at a `lh3.googleusercontent.com` CDN from sign-up metadata. The Avatar component renders them happily; the `onError` fallback covers expiry. A user's first upload overwrites with our bucket URL.

## Stage controller + timer

PRD §5.3 / §4 — facilitator drives the session's stage state (timer + progression); participants see a live countdown in the Builder sidebar. Server-authoritative state in Postgres, Supabase Realtime `postgres_changes` for participant propagation. The state machine, math helpers, and React surface all share a single source of truth.

**Data model** ([migrations/20260518120000_stage_runtime_state.sql](../../supabase/migrations/20260518120000_stage_runtime_state.sql)):

- `public.stage_status` enum: `pending` | `active` | `paused` | `completed`.
- `public.stages` runtime columns: `status` (default `pending`), `paused_at`, `total_paused_ms` (≥0), `extended_seconds` (≥0). `duration_seconds` was pre-existing — now seeded with PRD §4 defaults via `STAGE_DEFAULT_DURATIONS_SECONDS` ([lib/sessions/stage-labels.ts](../../lib/sessions/stage-labels.ts), backfill in [migrations/20260518140000_backfill_stage_durations.sql](../../supabase/migrations/20260518140000_backfill_stage_durations.sql)).
- `public.sessions.current_stage_id uuid` — pointer to the live stage; nullable so a fresh session has no current stage; `ON DELETE SET NULL` so cascade-deletes nullify cleanly.
- `public.stage_events` — append-only audit log keyed on `(session_id, stage_id, verb, actor_profile_id, metadata jsonb, created_at)`. Allowed verbs: `start` / `pause` / `resume` / `extend` / `advance` / `rollback` / `reset` (the last added in [migrations/20260519000000_stage_events_reset_verb.sql](../../supabase/migrations/20260519000000_stage_events_reset_verb.sql)). Org-members SELECT, facilitator INSERT, no UPDATE/DELETE policies (append-only at the RLS layer).
- Realtime publication adds for `stages` + `sessions`, and `REPLICA IDENTITY FULL` on both ([migrations/20260518130000_stages_realtime_identity.sql](../../supabase/migrations/20260518130000_stages_realtime_identity.sql)) so `postgres_changes` UPDATE payloads carry the full row through the RLS row-filter.

**State machine** ([lib/sessions/stage-state-machine.ts](../../lib/sessions/stage-state-machine.ts)). Allowed transitions:

| From        | Allowed verbs                          |
| ----------- | -------------------------------------- |
| `pending`   | `start`                                |
| `active`    | `pause`, `extend`, `advance`, `reset`  |
| `paused`    | `resume`, `extend`, `advance`, `reset` |
| `completed` | `rollback`                             |

`isValidTransition(from, verb)` is the single guard used by every server action AND by the UI to gate button visibility. **Add new verbs in two places (the union + the ALLOWED record) and update the `stage_events.verb` CHECK constraint via a new migration.**

**Server actions** ([app/sessions/stage-controller-actions.ts](app/sessions/stage-controller-actions.ts)). Pattern: validate UUID → RLS-scoped read (auth + org-membership gate) → assert caller is the session facilitator → state-machine precondition → `getServiceSupabaseClient()` UPDATE + INSERT into `stage_events` (NOT atomic — see the inline NOTE; follow-up tracks a plpgsql RPC for that) → `revalidatePath`. Discriminated `StageActionResult` union; the UI surfaces failures inline via [SessionStages.tsx](app/sessions/[id]/SessionStages.tsx) `messageForCode`. Six per-stage verb actions, plus `updateStageDurationAction` (60s ≤ N ≤ 7200s, only allowed while `status === 'pending'` — config edit, no `stage_events` row, mirrors `updateStageMeta`), plus the session-level `endSessionAction` (facilitator-only, idempotent on already-completed sessions, marks `sessions.status = 'completed'` and forces any active/paused `current_stage_id` stage to `completed` with `ended_at = now()`; no `stage_events` row because it's session-level, not per-stage).

**Reset semantics.** Reset is the only verb that doesn't change `status` — `active` and `paused` both become `active` with `started_at = now()`, `paused_at = null`, `total_paused_ms = 0`, `extended_seconds = 0`. The pre-reset values land in `stage_events.metadata` for the post-session report (`previous_started_at`, `previous_extended_seconds`, `previous_total_paused_ms`, `previous_status`). The Reset button gets a warning-tone amber style (`btn('warning')`) — destructive enough to telegraph "this clears extend/pause history" without screaming red.

**Realtime hook** ([components/session/useSessionStages.ts](../../components/session/useSessionStages.ts)). One channel per session, named `session:${sessionId}`. Subscribes to `*` events on `stages` (filtered by `session_id`) + `UPDATE` events on `sessions` (filtered by `id`). Two production-critical fixes baked in:

1. **JWT for Realtime.** Supabase Auth's `INITIAL_SESSION` event (fired on returning users) doesn't trigger `realtime.setAuth`, so the WS connection stays anonymous and RLS drops every payload. The hook eagerly calls `supabase.auth.getSession()` + `supabase.realtime.setAuth(token)` BEFORE creating the channel so the join frame carries the user's token.
2. **INSERT dedup.** The local Supabase CLI's Realtime replays WAL events that landed just before the channel subscribed, producing duplicate `INSERT` payloads for rows already in the initial fetch. The handler dedupes by id.

Also handles reconnect: on the second-and-later `SUBSCRIBED` callback (post-`CHANNEL_ERROR`), it refetches the full session + stages to backfill anything missed.

**UI surface** ([SessionStages.tsx](app/sessions/[id]/SessionStages.tsx)). One client component, five regions per stage row:

- **Right column timer/duration display.** On `pending` + `canManageSession`, renders an inline `StageDurationEditor` (clickable "15 min" chip → minutes input, Enter to save, Esc to cancel). Otherwise renders the big tabular-num countdown. The participant-side mirror lives in [components/session/StageTimer.tsx](../../components/session/StageTimer.tsx) (same variant pattern: pill + dot + digits, with critical/active/paused/completed/pending styles).
- **`ModelAction` row.** `Delete` + `Open model` (or `Start your model` if none owned). The facilitator-only `Advance` verb used to live here as a dark primary button; it was moved into the dashed timer cluster + an expiry banner (see below) so a facilitator-only flow-control verb wasn't shouting next to the every-participant Open model action.
- **`StageExpiryBanner` (active stage, `remaining ≤ 0`, facilitator-only).** A red soft-tone banner that sits above the existing flex row when the timer hits 0:00. Carries `Extend +5m` (secondary) + `Advance` (primary, hidden on the last stage where the natural next action is end-session). Same `data-testid="advance-stage-button"` as the cluster's Advance — only one is ever rendered at a time, so e2e selectors keep working. Takes its actions via props ([components/session/StageExpiryBanner.tsx](../../components/session/StageExpiryBanner.tsx)) so it's testable in isolation; the page passes `STAGE_ACTIONS` + the shared `messageForCode`.
- **Dashed `Stage timer` cluster.** Pause / Resume / Extend +5m / Reset / Advance / Stop session / Rollback to here. Every verb here is flow control for the currently-displayed stage; Advance is included even though it ends the stage rather than touching the clock — it's the natural cut-short affordance and shares the same caller (facilitator) and authorisation as the other cluster verbs. Each verb is gated by `isValidTransition(status, verb)`; Extend only shows when `duration_seconds !== null`; Advance hides on the last stage and when the [`StageExpiryBanner`](../../components/session/StageExpiryBanner.tsx) above is already promoting it; Rollback only on the most-recently-completed stage.
- **`ParticipantsPanel`.** Always rendered for `canManageSession` regardless of count (empty state: "No participants yet"). Header is `Participants (N)` + a small icon-only refresh button (`title="Refresh to see your participants"`, `data-testid="refresh-participants-${stageType}"`) that calls `router.refresh()` inside a `useTransition` so the spin icon stays active until the server component re-renders with fresh rows. Each participant row carries a live-dot ([emerald when `lastUpdatedAt` is within 10s](app/sessions/[id]/SessionStages.tsx), zinc otherwise) and an Open link to the participant's model. Non-facilitators never see this panel.

Both timer and controller use `useNowMs()` for the 1Hz wall-clock tick; the math comes from [lib/sessions/computeRemainingMs.ts](../../lib/sessions/computeRemainingMs.ts) which clamps `Math.max(0, Math.min(totalMs, totalMs - elapsed))` to defend against client clock skew. Buttons get tactile `active:scale-[0.98]` feedback.

**End session.** The `SessionStages` header carries a small icon-only red Stop button (`EndSessionButton`) — visible only to `canManageSession` users on a non-completed session. Click → `DeleteConfirmDialog` from [components/app/](../../components/app/DeleteConfirmDialog.tsx) (reused, with `confirmLabel="End session"` / `confirmPendingLabel="Ending…"`) — same focus-trap and Escape-to-dismiss as every other destructive confirm in the app. Confirming fires `endSessionAction`, which marks the session completed and forces any live stage to `completed`. The header then collapses to the "Session complete" copy and the entire timer cluster + Advance buttons disappear (state-machine guards handle this implicitly — no extra UI logic).

## New-design entry points

- **From `/app/my-designs`:** the `New design` button opens a two-step wizard ([app/my-designs/NewDesignDialog.tsx](app/my-designs/NewDesignDialog.tsx)) — pick destination (Personal + each org), then pick session (skipped for Personal, includes inline "+ New session"). The wizard calls `createDesignAction({orgId, sessionId})` in [app/my-designs/actions.ts](app/my-designs/actions.ts).
- **From inside `/app/sessions/[id]`:** each stage has its own "New model" affordance that calls `createModelInStage` directly — no wizard, design lands in that stage.
- **Send to a session:** personal designs only. The card on `/app/my-designs` shows a paper-plane button next to the trash; opens [app/my-designs/SendToSessionDialog.tsx](app/my-designs/SendToSessionDialog.tsx) which picks org → session and calls `duplicateToSessionAction`. One-way copy: source stays where it was.
- **Import design (JSON):** [app/my-designs/ImportDesignButton.tsx](app/my-designs/ImportDesignButton.tsx) on the page header (between `Trash` and `New design`). Opens a `ModalBackdrop`-wrapped file picker, reads the `.brickthink.json` envelope (`{ format: "brickthink.design", version: 1, exportedAt, title, canvasState }`), and calls `importDesignAction` in [app/my-designs/actions.ts](app/my-designs/actions.ts). The action validates the envelope via [lib/exports/json.ts](../../lib/exports/json.ts) `parseExportEnvelope`, rejects any brick code not in [lib/bricks/manifest.ts](../../lib/bricks/manifest.ts) `KNOWN_BRICK_CODES`, then inserts a new **Personal** model (no `session_id`/`org_id`/`stage_id`). Importing always creates new — never overwrites — and lands the user on `/app/designs/{newId}`.

## Stage rooms (breakout groups)

Replaces the single-canvas-per-`shared_model` semantics with facilitator-partitioned rooms. Each room has exactly one `models` row (`models.room_id` set, `owner_profile_id = facilitator`); room membership is recorded in `stage_room_members` and is mutually exclusive within a stage. Downstream stages (`system_model`, `guiding_principles`) can compose new rooms from upstream rooms via `stage_room_sources` — schema is ready, UI/actions for those two stages are a follow-up; today the only room-aware stage in the UI is `shared_model`.

**Data model** ([migrations/20260519130000_stage_rooms.sql](../../supabase/migrations/20260519130000_stage_rooms.sql)):

- `public.stage_rooms` — `(id, stage_id, position, title)`. Unique on `(stage_id, position)` and composite-unique on `(id, stage_id)` so `stage_room_members` can FK on that pair (which is what gives us the mutual-exclusion-per-stage guarantee through the `unique (stage_id, profile_id)` index).
- `public.stage_room_members` — `(room_id, stage_id, profile_id)`, denormalised stage_id only exists for the unique index. Shared_model rooms only.
- `public.stage_room_sources` — `(room_id, source_room_id)`. Server action validates that source rooms are on the immediately-preceding stage in `IMPORT_RULES`; not yet enforced at the DB level.
- `public.models.room_id` — nullable FK to `stage_rooms` with `on delete cascade`. `models_room_uniq` enforces the 1-1; the existing `models_session_stage_owner_active_idx` was rebuilt with `room_id is null` in its predicate so personal-per-stage uniqueness still applies for non-room canvases while the facilitator can own many room canvases per stage.
- `public.can_edit_room(p_profile_id, p_model_id)` — service-role-only recursive SQL function. Walks `stage_room_sources` back to the root `shared_model` room and checks membership. Used by the worker pre-upgrade and by the design [id] page for the liveMode gate.
- Backfill: every pre-existing `shared_model` model becomes Room 1 on its stage with every session-org member enrolled, so legacy sessions keep working.

**Server actions** ([app/sessions/stage-room-actions.ts](app/sessions/stage-room-actions.ts)):

- `setSharedModelRooms({ stageId, rooms[] })` — atomic re-partition: facilitator gate → wipe prior rooms (cascades to canvases + members) → for each new partition, insert a `stage_rooms` row, compose its canvas from members' `individual_model` bricks via `composeRoomCanvas`, insert the `models` row with `room_id` set, write the membership rows. `'duplicate_member' | 'unknown_member' | 'empty_partition' | 'not_facilitator' | 'unsupported_stage_type'` cover the refusal codes.
- `deleteSharedModelRoom(roomId)` — facilitator-only single-room remove; cascades.
- `createModelInStage` on `shared_model` now resolves the caller's assigned room and redirects to its model; there is no longer a service-role-elevated single-canvas insert on that stage.

**Lane layout** ([lib/sessions/stage-rooms.ts](../../lib/sessions/stage-rooms.ts)):

`composeRoomCanvas(lanes)` lays each member's `individual_model` bricks side-by-side. Each lane: ids regenerated via `remapCanvasForImport`, root group renamed `"{displayName}'s {group}"`, bricks translated so their left edge sits at the lane's x-origin (cumulative width + `LANE_GAP_PX = 80`). Empty lanes (member with no individual_model bricks) still reserve `EMPTY_LANE_WIDTH_PX = 320` so the resulting canvas still telegraphs which participants are in the room. Y-coordinates are preserved.

**UI surface** ([app/sessions/[id]/SessionStages.tsx](app/sessions/[id]/SessionStages.tsx), [RoomsPanel.tsx](app/sessions/[id]/RoomsPanel.tsx), [ManageRoomsDialog.tsx](app/sessions/[id]/ManageRoomsDialog.tsx)):

- `SessionStages` branches on `stage_type`. For `shared_model`: the `ModelAction` row is suppressed (no "Start your model" affordance anymore) and `ParticipantsPanel` is replaced with `RoomsPanel`. Other stages are unchanged.
- `RoomsPanel` shows the facilitator a per-room list (`Room N` / optional title + member count + `Open` link per room) plus a `Manage rooms` button that opens `ManageRoomsDialog`. Participants see one of three states: `Open my room` (assigned), `Waiting for the facilitator to assign you to a room` (not assigned but rooms exist), or `Waiting for the facilitator to set up rooms` (no rooms exist yet).
- `ManageRoomsDialog` lists the full org roster in two columns: an "Unassigned" pool on the left and one card per draft room on the right (with an inline title input, member rows, a "+ Add room" button, and a per-room remove button). Each member row has a small `<select>` (Unassigned / Room 1 / Room 2 / …) — selection-based assignment, mobile-friendly. Save fires `setSharedModelRooms`; errors render inline.

**liveMode gate** ([lib/yjs/canPlaceLive.ts](../../lib/yjs/canPlaceLive.ts), [app/designs/[id]/page.tsx](app/designs/[id]/page.tsx)):

- `canPlaceLive({ sessionContext, flagEnabled, isRoomMember })` — `isRoomMember` is `boolean` for room-backed canvases and `null` for non-room canvases (legacy fallback keeps the prior "every session-org member co-edits" behaviour).
- The design [id] page calls `public.can_edit_room` via the service-role RPC when `data.room_id` is set and passes the result through. Non-room-members on a room canvas drop to read-only.
- The "Bring in my previous model" affordance is suppressed for room-backed canvases — auto-import already ran at room creation, the manual card is redundant.

**Yjs worker** ([worker/src/auth.ts](../../worker/src/auth.ts)):

Upgrade verification now runs a combined query: `can_read_model` (legacy gate), the model's `room_id`, and `can_edit_room`. Room-backed canvases require both; non-room canvases keep the read-only gate. Non-members get a `403 not a room member` WS rejection — distinct from the existing `not a member` reason so logs disambiguate.

**Follow-ups (deferred)**:

- `system_model` and `guiding_principles` room composition (the schema is ready; UI + server actions are not). Until then, the existing `bringInPreviousModel` for `system_model` (`source_mode: 'session_shared'`) will throw on sessions with N>1 `shared_model` rows — the `.maybeSingle()` query returns the wrong cardinality. New sessions that create multi-room shared_model stages can't currently roll forward to system_model via the manual bring-in. Legacy backfilled sessions (1 room with everyone) continue to work.
- e2e specs that exercise the old `shared_model` single-canvas flow ([yjs-shared-model.spec.ts](../../e2e/yjs-shared-model.spec.ts), `shared_model` branch of [bring-in-previous-model.spec.ts](../../e2e/bring-in-previous-model.spec.ts)) need rewriting to first call `setSharedModelRooms` before opening the canvas. Integration suite is already green against the new semantics.

## Bring in my previous model

Per PRD §4.3 / §4.4 — when a session advances and the participant lands on a blank canvas, they can carry their previous-stage bricks forward with one click. One-shot, fully undoable on shared_model via the per-client Yjs undo stack.

**Whitelist** ([lib/sessions/stage-import.ts](../../lib/sessions/stage-import.ts) `IMPORT_RULES`). Every stage except `skill_building` is a valid target. Source is per-stage:

| Target              | Source             | Source scope    |
|---------------------|--------------------|-----------------|
| `individual_model`  | `skill_building`   | caller_own      |
| `shared_model`      | `individual_model` | caller_own      |
| `system_model`      | `shared_model`     | session_shared  |
| `guiding_principles`| `system_model`     | caller_own      |

`isImportTarget()` is the single guard used by the page (to know whether to render the affordance) and the server action (to refuse non-target stages). When `CANONICAL_STAGE_TYPES` gains a new stage, `IMPORT_RULES` and the exhaustive unit tests will force-fail until the new row is decided.

**Server action** [bringInPreviousModel(targetModelId)](app/sessions/stage-import-actions.ts). RLS-scoped read for authz, service-role write. Branches on whether the target is Yjs-backed:

- **`shared_model` (the only Yjs target):** writes `model_imports` audit row FIRST as the database-layer gate (`unique (target_model_id, profile_id)` catches double-click races as `already_imported`), then returns `{ mode: 'client_append', source }` with a remapped canvas — fresh group/brick ids and a per-user root-group rename (`"{displayName}'s {groupName}"`) so the shared Layers panel disambiguates contributors. Client appends bricks via the [appendImportedBricks](../../components/builder/builderState.tsx) slice on `BuilderState`, wrapped in a single `liveDoc.transact(..., YJS_LOCAL_ORIGIN)` so it lands as one undo step and broadcasts as one Yjs update.
- **autosave-backed targets** (`individual_model`, `system_model`, `guiding_principles`): server re-reads the destination canvas under service-role, refuses with `destination_not_empty` if non-empty, then UPDATE-s `canvas_state` with the remapped source and INSERT-s the audit row (23505 swallowed for race-no-op). Returns `{ mode: 'server_copied' }`. Client triggers `window.location.reload()` — needed because `BuilderProvider` initialises canvas state once via `useState(() => …)` and won't re-init on prop change.

**Audit table** `public.model_imports` (see [supabase/CLAUDE.md](../../supabase/CLAUDE.md)). One row per `(target_model_id, profile_id)`. `profile_id` and `source_model_id` are `on delete set null` so audit history survives author/source-model deletion; `target_model_id` cascades since the row is meaningless once the destination is gone.

**UI** ([components/builder/BringInPreviousModelButton.tsx](../../components/builder/BringInPreviousModelButton.tsx)). Three exports driven by a single context — `BringInPreviousModelProvider` wraps the builder body, `BringInPreviousModelCard` renders the centered empty-state card on the canvas, `BringInPreviousModelReopenButton` sits in the sidebar above `Save version`. The card hides on three conditions: `alreadyImported` (server-rendered from the `model_imports` row count at page load), `justImported` (client-side, flipped immediately after a successful `client_append` so the card vanishes without waiting for a reload), or `dismissed` (user clicked the close X). The reopen button shows only when `dismissed && !justImported && !alreadyImported` — recoverable affordance. Both card and button gate on the shared `useAffordanceEligible()` predicate so non-eligible models (read-only, non-session, non-whitelisted stage, system_model with bricks already placed) skip them both.

**Test surface.** Unit tests for the pure helpers in [lib/sessions/stage-import.test.ts](../../lib/sessions/stage-import.test.ts) cover `IMPORT_RULES`, `isImportTarget` exhaustively against `CANONICAL_STAGE_TYPES`, and `remapCanvasForImport` (id regen, orphan-brick drop, root-group rename, round-trip through `parseCanvasState`). Integration tests in [tests/integration/bringInPreviousModel.integration.test.ts](../../tests/integration/bringInPreviousModel.integration.test.ts) cover all 7 failure codes, the system_model + shared_model + individual_model + guiding_principles happy paths, and cross-session isolation. E2E spec at [e2e/bring-in-previous-model.spec.ts](../../e2e/bring-in-previous-model.spec.ts) exercises two-tab Yjs propagation on shared_model and the server-copy + reload flow on system_model.

## Exports surface — PNG / SVG / JSON

There is no `/app/exports` page (PRD §8.1 deferred to Phase 2 with the `exports` table + queue). Exports are per-design and produced client-side on demand by three pure renderers in `lib/exports/`:

- [lib/exports/png.ts](../../lib/exports/png.ts) — `renderCanvasToPngBlob({ canvasState, stage?, padding?, pixelRatio? })`. With a live `Konva.Stage` (Builder) it captures off the live layer; without one it lazy-imports Konva, hydrates a detached Stage from `canvasState`, renders, disposes (My Designs card). Empty canvas → 1×1 transparent PNG.
- [lib/exports/svg.ts](../../lib/exports/svg.ts) — hand-walks visible bricks into one `<image>` per brick with base64 PNG embeds (deduped by source path). Brick assets are PNG-only (no vector source) so this is a structured raster artefact, not true vector — usable for downstream PDF/DOCX embedding in Phase 2.
- [lib/exports/json.ts](../../lib/exports/json.ts) — versioned envelope (`format` + `version` + `exportedAt` + `title` + `canvasState`). Same module owns `parseExportEnvelope` for the import path — the parser cross-checks brick/group counts because `parseCanvasState` in [lib/models/canvasState.ts](../../lib/models/canvasState.ts) silently drops malformed entries.

The shared UI is [components/exports/ExportMenu.tsx](../../components/exports/ExportMenu.tsx) — a three-item Download menu (PNG / SVG / JSON) with two source variants:

- **Builder** — mounted next to `ShareButton` in [components/builder/Builder.tsx](../../components/builder/Builder.tsx) at `right-5 top-5`. Reads the live stage via `useBuilderState().stage` (registered by [components/builder/BuilderCanvas.tsx](../../components/builder/BuilderCanvas.tsx) on mount through the new `registerStage` slice on `BuilderState`). PNG capture goes straight off the in-memory Stage; SVG and JSON consume the in-memory `{ groups, bricks, title }`.
- **My Designs card** — a fourth hover-revealed action on [app/my-designs/DesignList.tsx](app/my-designs/DesignList.tsx), positioned by the `rightFor` slot calculator alongside Tag / Send / Trash. The card source is just a `modelId`; the menu lazy-imports the renderers + calls `getModelExportPayload(modelId)` (also in [app/my-designs/actions.ts](app/my-designs/actions.ts)) to fetch `{ title, canvasState }` via RLS. PNG hydrates Konva off-screen so the my-designs default bundle stays light.

Filenames go through `buildExportFilename(title, ext)` in [lib/exports/filename.ts](../../lib/exports/filename.ts): slugified title (or `design` fallback) with the literal extension — `.png` / `.svg` / `.brickthink.json` (double extension on the last so the format is obvious on disk).

**Non-goals (open-source flip removed billing 2026-05-18).** No watermarks, no plan-gating, no retention tiers. Don't reintroduce them as side-effects of touching the exports surface.

When you add a new authenticated list page, derive its context from the URL or page-level props (a server component reads memberships + filters from `searchParams`). Do not reintroduce a global switcher or any `profiles.active_org_id`-style mutable context column — it was removed for a reason (URL-driven context is shareable, bookmarkable, and survives reloads without a round-trip).

## Modal dialog shape

When a destructive action or a multi-field create flow needs confirmation/input, use a centered modal — not an inline expand-in-place form. **Wrap your panel in [`<ModalBackdrop>`](../../components/app/ModalBackdrop.tsx)** instead of hand-rolling the backdrop / Escape effect each time. The primitive is consumed by [app/my-designs/NewDesignDialog.tsx](app/my-designs/NewDesignDialog.tsx), [app/my-designs/SendToSessionDialog.tsx](app/my-designs/SendToSessionDialog.tsx), [app/my-designs/ManageTagsDialog.tsx](app/my-designs/ManageTagsDialog.tsx), [app/orgs/[id]/sessions/NewSessionDialog.tsx](app/orgs/[id]/sessions/NewSessionDialog.tsx), [app/orgs/[id]/AddMemberDialog.tsx](app/orgs/[id]/AddMemberDialog.tsx), [app/orgs/[id]/DeleteOrgButton.tsx](app/orgs/[id]/DeleteOrgButton.tsx), and [app/orgs/[id]/LeaveOrgButton.tsx](app/orgs/[id]/LeaveOrgButton.tsx).

What `ModalBackdrop` handles:

- The fixed-position overlay + interactive `<button>` backdrop (no `jsx-a11y` suppressions needed — an earlier hand-rolled version used a `<div onClick>` that tripped `click-events-have-key-events` and `no-noninteractive-element-interactions`; the button avoids both).
- `Escape` to close via a window-level keydown listener.
- `role="dialog"`, `aria-modal="true"`, and wiring `aria-labelledby` (pass `titleId` from a `useId()` on your heading) or `aria-label` (pass `ariaLabel` when there's no visible heading).

What the consumer still owns:

- The inner panel shape — `rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]` is the convention. Width defaults to `w-full max-w-md` via the primitive's `panelClassName` prop; override if you need wider.
- Focusing the first input/affordance on open via a `useRef` + `inputRef.current?.focus()` effect. Don't use `autoFocus` on inputs that mount on page load.
- Server-action errors render inline inside the modal, not as a toast. NEXT_REDIRECT throws from a server action are success — rethrow them so Next can perform the redirect.
- Per-dialog Tab trapping is **no longer the consumer's job** — the [`useFocusTrap`](../../lib/a11y/useFocusTrap.ts) hook is wired inside `ModalBackdrop` itself (since Phase 3 of the WCAG remediation) and cycles Tab / Shift+Tab between the dialog's tabbable descendants. Initial focus is still per-dialog (e.g. `inputRef.current?.focus()` on open).

## Icon-trigger header actions

Header actions for low-frequency destructive operations (leave/delete an org, future archive/export buttons) are icon-only buttons (`h-9 w-9` square, `aria-label` + `title`) that open the modal above. Don't ship a labeled red button in a header — it screams louder than it should. Keep `Create session`-style primary buttons full-width with the label, since those are the action you want users to take.

## Badge pill convention

Status-style metadata on cards uses a consistent pill: `inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600`. Used for the `Personal` / `{Org}` badge on design cards ([app/my-designs/DesignList.tsx](app/my-designs/DesignList.tsx)) and the role chip on member cards ([app/orgs/[id]/MemberRow.tsx](app/orgs/[id]/MemberRow.tsx)). When a card carries two related metadata points (org name + session title), put the categorical one (org name) in the pill and leave the human-readable one (session title) as plain `text-[12px] text-zinc-600` next to it.

## Stage status pill palette

Distinct from the categorical badge above: the **runtime** status pill on session stage cards uses a per-status colour family so a facilitator can scan a long stage list and pick out the live stage, the paused stage, and the run-up at a glance. The palette is duplicated in two places that must stay in sync — [SessionStages.tsx](app/sessions/[id]/SessionStages.tsx) (`STATUS_PILL_CLASSES` / `STATUS_DOT_COLOURS`, facilitator view) and [components/session/StageTimer.tsx](../../components/session/StageTimer.tsx) (`PILL_CLASSES` / `DOT_COLOURS`, participant-sidebar mirror). When you change one, change both.

| Status      | Background    | Text          | Ring             | Dot            | Meaning                                  |
| ----------- | ------------- | ------------- | ---------------- | -------------- | ---------------------------------------- |
| `pending`   | `yellow-50`   | `yellow-700`  | `yellow-200/70`  | `yellow-500`   | Waiting to start — warm but quiet        |
| `active`    | `emerald-50`  | `emerald-800` | `emerald-200`    | `emerald-500`  | Live — the "now" signal                  |
| `paused`    | `amber-100`   | `amber-900`   | `amber-300`      | `amber-600`    | Needs facilitator attention — hotter     |
| `completed` | `sky-50`      | `sky-800`     | `sky-200`        | `sky-600`      | Finished — cool counterpoint to warm     |
| `critical`  | `red-50`      | `red-800`     | `red-200`        | `red-500`      | `StageTimer.tsx` only — < 30 s remaining |

Design notes:

- **Pending and paused share the warm-yellow family on purpose.** They're semantically related ("stage is not progressing"), but `paused` is one shade hotter on every channel (50 → 100, 200 → 300, 500 → 600) so the "needs attention" pill still pops over the calmer "not started yet" pill.
- **No two greys.** The previous palette used zinc for both `pending` and `completed`, which made it impossible to tell at a glance which stages were upcoming vs done. Both lanes now carry colour.
- **Contrast floor (WCAG 2.2 AA).** All text-on-background combinations clear 4.5:1: `yellow-700` on `yellow-50` ≈ 6.4:1, `amber-900` on `amber-100` ≈ 10:1, `sky-800` on `sky-50` ≈ 9:1, `emerald-800` on `emerald-50` ≈ 7:1. Don't soften any of these (e.g. dropping pending to `yellow-500` text) without re-measuring.
- **Card border still glows only for `active`.** The pill is the per-row signal; the wrapper border (`border-emerald-300/70 ring-1 ring-emerald-200/60` in [SessionStages.tsx](app/sessions/[id]/SessionStages.tsx)) is the page-level "where is the live stage" signal. Don't tint the border for every status — it makes the list feel like a Christmas tree.
- **Timer digit colour (`StageTimer.tsx` `TIMER_CLASSES`) is intentionally NOT in the palette table.** Large digits stay `text-zinc-500` for `pending` / `completed` (timer isn't the primary signal then), `text-zinc-900` for `active`, `text-amber-700` for `paused`, `text-red-700` for `critical`. The pill carries the hue; the digits carry the weight.

## Hover-revealed row actions

Destructive or secondary card actions (trash, send, remove member) sit absolutely-positioned in the card's top-right, `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`. The `[@media(hover:none)]` query keeps them visible on touch where there's no hover. The parent card needs `group relative`.

## Accessibility — WCAG 2.2 AA conventions

PRD §5.7 + §9.2 set WCAG 2.2 AA as a hard launch-gate requirement. Phases 0–4 of the remediation shipped between 2026-05-18 and 5ff044b on `main`; the followups doc at `docs/superpowers/followups/2026-05-18-wcag-followups.md` (local-only, gitignored) captures what closed, what was deferred (captions/transcripts, no-time-pressure timer, ShareCanvas read-only AT mirror), and the third-party audit kickoff brief.

Shared a11y primitives live under [lib/a11y/](../../lib/a11y/) and must be reused, not re-invented:

- **[`useFocusTrap`](../../lib/a11y/useFocusTrap.ts)** — Tab cycling inside a container; already wired into `ModalBackdrop`.
- **[`usePrefersReducedMotion`](../../lib/a11y/usePrefersReducedMotion.ts)** — `prefers-reduced-motion: reduce` media query as a React hook. Gate any JS-driven animation (Konva tweens, presence cursor smoothing) on this. CSS-only animations are already clamped in [app/globals.css](../../app/globals.css).
- **[`isCanvasGridFocused`](../../lib/a11y/isCanvasGridFocused.ts)** — true when the focused element is inside the builder's `role="grid"` mirror. Window-level keyboard listeners (Delete, Space pan-lock) bail when this returns true so the cell-level handlers in `CanvasA11yMirror` own keyboard input on the canvas.
- **[`moveRowFocus`](../../lib/a11y/moveRowFocus.ts)** — walks `[role="button"][tabindex="0"]` rows inside a scoped panel; used by `LayersPanel` for ArrowUp/Down nav.
- **[`A11yPreferences` + `normaliseA11yPreferences`](../../lib/a11y/preferences.ts)** — type + JSON normaliser for the `profiles.a11y_preferences` column. Always read via the normaliser so schema drift / bad JSON falls back to defaults.

Authed-app-specific conventions added by the remediation:

- **Canvas AT mirror.** [`CanvasA11yMirror`](../../components/builder/CanvasA11yMirror.tsx) is a parallel `<div role="grid">` rendered inside `BuilderCanvas` (the visual canvas is Konva). Every placed brick is a focusable `role="gridcell"` carrying name + colour + row/column in its accessible name. Keyboard ops (arrows / Enter / Space / Delete / R / C) live on the cell handlers; visual focus is drawn by Konva as a dashed Rect using the brand ring colour. The mirror also emits `data-testid="placed-brick"` per cell, preserving the e2e contract used across `persistent-designs`, `session-designs`, `share-links`, and `yjs-shared-model` specs.
- **Colourblind mode.** [`BrickPatternOverlay`](../../components/builder/BrickPatternOverlay.tsx) renders a distinct visual pattern (diagonal stripes, dots, cross-hatch, etc.) on top of each brick when `profiles.a11y_preferences.colourblindMode === true`. The toggle lives on `/app/account` via `A11yPreferencesCard`. Pattern selection: [lib/bricks/patterns.ts](../../lib/bricks/patterns.ts) `patternForColor()`.
- **`data-scroll-target` attribute.** Add this attribute to row-level wrappers on any new list page that sits under the sticky header (4.5rem). `app/globals.css` applies `scroll-margin-top: 4.5rem` to focusable descendants so keyboard nav doesn't park focus behind the header. Reference applications: [DesignList.tsx](app/my-designs/DesignList.tsx), [orgs/page.tsx](app/orgs/page.tsx), [SessionsList.tsx](app/orgs/[id]/sessions/SessionsList.tsx), [SessionStages.tsx](app/sessions/[id]/SessionStages.tsx).
- **Help link.** [`GlobalHeader`](../../components/app/GlobalHeader.tsx) carries a single "Help" link to the GitHub issues tracker. Don't add a second help surface elsewhere — WCAG 3.2.6 (Consistent Help, new in 2.2) requires consistent placement; one link in the header satisfies it across the whole authed surface.
- **Single-select chip groups are `role="radiogroup"`, not `aria-pressed` buttons.** The pieces-drawer category chips were the first case ([PiecesDrawer.tsx](../../components/builder/PiecesDrawer.tsx)). When you introduce another chip group, follow the same idiom: `role="radiogroup"` container + `role="radio"` per chip + `aria-checked` per chip.
- **Contrast floor: `text-zinc-500` on white, `text-zinc-600` on `bg-zinc-900/5`.** `text-zinc-400` on white was 2.56:1 (below both 4.5:1 text and 3:1 non-text); Phase 4 swept all such instances. Don't reintroduce `text-zinc-400` over a light background unless the element is `aria-hidden="true"` (decorative).
- **Target size floor: 24×24 CSS pixels.** Interactive elements (`<button>`, `<a>`, `onClick` div) must be ≥ 24×24 (WCAG 2.5.8, new in 2.2). Most icon buttons are `h-9 w-9` (36px) or `h-11 w-11` (44px) — well above. Group-collapse `<button>`s in `LayersPanel` were the only sub-floor case before Phase 4. Don't reintroduce `h-5 w-5` / `h-4 w-4` on a click target.

Verification harness:

- **`pnpm a11y:lhci`** — Lighthouse CI runs against `/`, `/sign-in`, `/privacy`, `/terms` asserting `categories:accessibility >= 0.95`. Authed-route audits would need a Puppeteer auth script (deferred — captured in the followups doc).
- **`pnpm test:e2e -- e2e/a11y.spec.ts`** — axe-core scans across every authed route. The `design-builder` route is hard-fail (`expect`); other routes are `expect.soft` until the third-party audit confirms no additional violations. See [e2e/CLAUDE.md](../../e2e/CLAUDE.md) for the spec layout.
