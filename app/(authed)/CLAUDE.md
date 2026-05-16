# UI conventions — authed app

Scope: pages under `app/(authed)/`. The nav IA, modal shape, badge pills, and hover-revealed actions described here are repeated across the authed surface; keep new pages consistent unless there's a deliberate reason to diverge.

## Navigation hierarchy: Organisations → Sessions → Designs

The app's IA is a single hierarchy with one cross-cutting index. Context comes from the URL on each page — there is no global "active org" state on the profile, no header switcher. The header has exactly two links: `Organisations` and `My Designs`.

- **`/app/my-designs`** ([app/my-designs/page.tsx](app/my-designs/page.tsx)) is the aggregate index of every design the signed-in user has authored (`owner_profile_id = me`), regardless of where it lives. Each card carries a badge: `Personal` (model has no session/org) or `{Org} · {Session}` (session-scoped). The page-level Filter dropdown narrows by Personal or by a specific org via `?filter=personal|org-<uuid>`; the URL is the source of truth (see [../../lib/my-designs/types.ts](../../lib/my-designs/types.ts) `parseFilter` / `serializeFilter`).
- **`/app/orgs`** lists the orgs you're a member of; clicking one navigates to **`/app/orgs/[id]`** which shows that org's sessions list (primary content), member roster, and admin actions. Sessions list is the default surface — no separate `/app/orgs/[id]/sessions` route. The header carries the action group on the right: leave (icon), delete (icon, owner-only), and `Create session` (primary). Creating a session and adding a member both happen in modal dialogs ([app/orgs/[id]/sessions/NewSessionDialog.tsx](<app/orgs/[id]/sessions/NewSessionDialog.tsx>), [app/orgs/[id]/AddMemberDialog.tsx](<app/orgs/[id]/AddMemberDialog.tsx>)) — no inline forms on the page.
- **`/app/sessions/[id]`** is the session detail page. Its eyebrow renders a breadcrumb `Organisations / {Org} / Session · {status}` linking back through the hierarchy. The facilitator-only "Session settings" panel (status / mode / scheduled-for) lives in [app/sessions/[id]/SessionMetaForm.tsx](<app/sessions/[id]/SessionMetaForm.tsx>) and the `updateSessionMeta` action in [app/sessions/actions.ts](app/sessions/actions.ts) — both intact, both real columns on `sessions`, but the panel is **not currently rendered**: nothing in the app branches on those fields yet, so showing an editor that has no observable effect was misleading. Re-import the component on [app/sessions/[id]/page.tsx](<app/sessions/[id]/page.tsx>) when status/mode/scheduled-for actually drive behaviour (state-machine, scheduling, async-mode UX, etc.).
- Sessions are **always org-scoped** (`sessions.org_id NOT NULL`). Designs in the org case are **always session-scoped**: a model has either `(org_id IS NULL AND session_id IS NULL)` for Personal, or `(org_id IS NULL AND session_id IS NOT NULL)` for session-scoped — the `models_context_exclusive` CHECK forbids both being set. The legacy "org-standalone" state (`org_id` set, `session_id` null) was migrated away in [../../supabase/migrations/20260515000000_nav_restructure.sql](../../supabase/migrations/20260515000000_nav_restructure.sql).

## New-design entry points

- **From `/app/my-designs`:** the `New design` button opens a two-step wizard ([app/my-designs/NewDesignDialog.tsx](app/my-designs/NewDesignDialog.tsx)) — pick destination (Personal + each org), then pick session (skipped for Personal, includes inline "+ New session"). The wizard calls `createDesignAction({orgId, sessionId})` in [app/my-designs/actions.ts](app/my-designs/actions.ts).
- **From inside `/app/sessions/[id]`:** each stage has its own "New model" affordance that calls `createModelInStage` directly — no wizard, design lands in that stage.
- **Send to a session:** personal designs only. The card on `/app/my-designs` shows a paper-plane button next to the trash; opens [app/my-designs/SendToSessionDialog.tsx](app/my-designs/SendToSessionDialog.tsx) which picks org → session and calls `duplicateToSessionAction`. One-way copy: source stays where it was.

When you add a new authenticated list page, derive its context from the URL or page-level props (a server component reads memberships + filters from `searchParams`). Do not reintroduce a global switcher or any `profiles.active_org_id`-style mutable context column — it was removed for a reason (URL-driven context is shareable, bookmarkable, and survives reloads without a round-trip).

## Modal dialog shape

When a destructive action or a multi-field create flow needs confirmation/input, use a centered modal — not an inline expand-in-place form. The shape is repeated across [app/my-designs/NewDesignDialog.tsx](app/my-designs/NewDesignDialog.tsx), [app/my-designs/SendToSessionDialog.tsx](app/my-designs/SendToSessionDialog.tsx), [app/orgs/[id]/sessions/NewSessionDialog.tsx](<app/orgs/[id]/sessions/NewSessionDialog.tsx>), [app/orgs/[id]/AddMemberDialog.tsx](<app/orgs/[id]/AddMemberDialog.tsx>), [app/orgs/[id]/DeleteOrgButton.tsx](<app/orgs/[id]/DeleteOrgButton.tsx>), and [app/orgs/[id]/LeaveOrgButton.tsx](<app/orgs/[id]/LeaveOrgButton.tsx>):

- Backdrop: `fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`.
- Dismissal: click-outside (`onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`) **and** `Escape` (window keydown listener wired in a `useEffect`). Both are required — neither alone covers keyboard + pointer users.
- Inner panel: `w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]`.
- Focus the first input/affordance on open via a `useRef` + `inputRef.current?.focus()` effect. Don't use `autoFocus` on inputs that mount on page load.
- Server-action errors render inline inside the modal, not as a toast. NEXT_REDIRECT throws from a server action are success — rethrow them so Next can perform the redirect.

The backdrop is a non-interactive `<div>` with a click handler, which trips `jsx-a11y/click-events-have-key-events` and `jsx-a11y/no-noninteractive-element-interactions`. Suppress with an inline `eslint-disable-next-line` directly above the offending `<div>` — not above `return (` (the directive doesn't carry across the newline and lint will still error).

## Icon-trigger header actions

Header actions for low-frequency destructive operations (leave/delete an org, future archive/export buttons) are icon-only buttons (`h-9 w-9` square, `aria-label` + `title`) that open the modal above. Don't ship a labeled red button in a header — it screams louder than it should. Keep `Create session`-style primary buttons full-width with the label, since those are the action you want users to take.

## Badge pill convention

Status-style metadata on cards uses a consistent pill: `inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600`. Used for the `Personal` / `{Org}` badge on design cards ([app/my-designs/DesignList.tsx](app/my-designs/DesignList.tsx)) and the role chip on member cards ([app/orgs/[id]/MemberRow.tsx](<app/orgs/[id]/MemberRow.tsx>)). When a card carries two related metadata points (org name + session title), put the categorical one (org name) in the pill and leave the human-readable one (session title) as plain `text-[12px] text-zinc-600` next to it.

## Hover-revealed row actions

Destructive or secondary card actions (trash, send, remove member) sit absolutely-positioned in the card's top-right, `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100`. The `[@media(hover:none)]` query keeps them visible on touch where there's no hover. The parent card needs `group relative`.
