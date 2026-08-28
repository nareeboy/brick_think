// Playwright fixture functions use `({}, use) => …` and call `use(...)` to
// hand the value to the test. The fixture lint rules ('no-empty-pattern',
// 'react-hooks/rules-of-hooks') are React-oriented and misfire here; they
// don't apply to Playwright's worker fixture convention.
/* eslint-disable no-empty-pattern, react-hooks/rules-of-hooks */

import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

// A signed-in page fixture. Mints a fresh test user per test via the
// dev-only /api/test/sign-in route (see app/api/test/sign-in/route.ts) and
// hands back a page whose cookie jar carries the resulting Supabase session.
//
// The route requires the `E2E_AUTH_ENABLED=1` env var on the server it talks
// to; playwright.config.ts sets this in the webServer block.

interface Fixtures {
  signedInEmail: string;
  signedInPage: Page;
  // A signed-in page whose user has been promoted to site admin
  // (public.profiles.is_site_admin = true) via the dev-only
  // /api/test/promote-site-admin route. Gives access to the /app/admin/*
  // surface (changelog editor, careers inbox, etc.).
  siteAdminPage: Page;
  seededSession: {
    sessionId: string;
    orgId: string;
    joinCode: string;
    stageIds: Record<
      | 'skill_building'
      | 'individual_model'
      | 'shared_model'
      | 'system_model'
      | 'guiding_principles',
      string
    >;
  };
}

function makeTestEmail(): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${suffix}@brick-think.test`;
}

const MAILPIT_BASE_URL = 'http://127.0.0.1:54324';

export interface MailpitMessage {
  subject: string;
  html: string;
  text: string;
}

// Poll Mailpit's search API for the newest message sent to `addr`; throws if
// nothing arrives within `timeoutMs`. Shared by every spec that reads email
// (magic-link-token-hash, participant-invite-email) — extend here, not with
// a spec-local copy.
export async function getMailpitMessage(addr: string, timeoutMs = 10_000): Promise<MailpitMessage> {
  const start = Date.now();
  const url = `${MAILPIT_BASE_URL}/api/v1/search?query=${encodeURIComponent(`to:${addr}`)}`;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { messages?: Array<{ ID: string; Subject: string }> };
        const message = data.messages?.[0];
        if (message) {
          const bodyRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${message.ID}`);
          if (bodyRes.ok) {
            const body = (await bodyRes.json()) as {
              Subject?: string;
              HTML?: string;
              Text?: string;
            };
            return {
              subject: body.Subject ?? message.Subject,
              html: body.HTML ?? '',
              text: body.Text ?? '',
            };
          }
        }
      }
    } catch {
      // Mailpit not reachable yet; retry.
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`getMailpitMessage: no email arrived for ${addr} within ${timeoutMs}ms`);
}

// Suppress every first-run overlay so specs see a "returning user" UI: the
// welcome modal / session and workshop tours, the canvas builder tutorial, and
// the cookie-consent card (which otherwise overlays the sidebar-bottom
// "Save version" button and intercepts clicks). This is THE canonical list —
// specs that hand-roll extra browser contexts (facilitator-live-readonly,
// participant-join, facilitator-narration, facilitator-notes,
// brick-reactions-comments) must call this instead of copying a subset;
// the canvas-tutorial drop regression came from exactly such a stale copy.
// Overlay-specific specs (onboarding-walkthrough, canvas-tutorial) re-enable
// their overlay by registering a second addInitScript that removes the
// relevant key — Playwright runs init scripts in registration order.
export async function suppressFirstRunOverlays(page: Page | BrowserContext): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('bt_role_choice', 'facilitator');
    window.localStorage.setItem('bt_welcome_seen', '1');
    window.localStorage.setItem('bt_session_tour_seen', '1');
    window.localStorage.setItem('bt_workshop_tour_seen', '1');
    window.localStorage.setItem('bt_canvas_tutorial_seen', '1');
    // Shape must match lib/consent/state.ts isDecision().
    window.localStorage.setItem(
      'bt.consent.v1',
      JSON.stringify({ v: 1, decidedAt: new Date().toISOString(), analytics: false }),
    );
  });
}

// ---------------------------------------------------------------------------
// Participant + stage-room helpers.
//
// Since the stage-rooms rework, the collaborative stages (shared_model,
// system_model, guiding_principles) are room-backed: only ROOM MEMBERS build
// in them, and the session facilitator deliberately observes read-only (see
// lib/models/readOnly.ts). Specs that exercise live room canvases therefore
// drive a seeded PARTICIPANT member — not the facilitator fixture user.
// ---------------------------------------------------------------------------

export interface ParticipantSetup {
  context: BrowserContext;
  page: Page;
  email: string;
  userId: string;
}

/**
 * Mint a second test user in the session's org (via /api/test/seed-session-member),
 * sign them in inside a fresh browser context, and hand back the context/page.
 * Overlay suppression is registered on the CONTEXT so any extra pages the spec
 * opens (two-tab collaboration tests) inherit it.
 */
export async function setUpParticipant(
  facilitatorPage: Page,
  sessionId: string,
  facilitatorEmail: string,
): Promise<ParticipantSetup> {
  const res = await facilitatorPage.request.post('/api/test/seed-session-member', {
    data: { sessionId, callerEmail: facilitatorEmail },
  });
  if (!res.ok()) {
    throw new Error(`seed-session-member failed (${res.status()}): ${await res.text()}`);
  }
  const { email, userId } = (await res.json()) as { email: string; userId: string };

  const browser = facilitatorPage.context().browser();
  if (!browser) throw new Error('browser missing');
  const context = await browser.newContext();
  await suppressFirstRunOverlays(context);
  const page = await context.newPage();

  const signInRes = await page.request.post('/api/test/sign-in', { data: { email } });
  if (!signInRes.ok()) {
    throw new Error(
      `participant sign-in failed (${signInRes.status()}): ${await signInRes.text()}`,
    );
  }

  return { context, page, email, userId };
}

export async function cleanupParticipant(
  facilitatorPage: Page,
  participant: ParticipantSetup,
): Promise<void> {
  const res = await facilitatorPage.request.post('/api/test/delete-user', {
    data: { userId: participant.userId },
  });
  if (!res.ok()) {
    console.warn(
      `[e2e] participant cleanup failed for ${participant.email} (${participant.userId}): ${res.status()} ${await res.text()}`,
    );
  }
  await participant.context.close();
}

/**
 * Service-role seed: one room on the given collaborative stage with the given
 * profiles enrolled, plus the canonical room-backed `models` row. Returns the
 * model id so specs can navigate straight to /app/designs/<modelId>.
 */
export async function seedStageRoom(
  facilitatorPage: Page,
  sessionId: string,
  facilitatorEmail: string,
  memberProfileIds: string[],
  stageType: 'shared_model' | 'system_model' | 'guiding_principles' = 'shared_model',
): Promise<{ modelId: string; roomId: string }> {
  const res = await facilitatorPage.request.post('/api/test/seed-shared-model-room', {
    data: { sessionId, callerEmail: facilitatorEmail, memberProfileIds, stageType },
  });
  if (!res.ok()) {
    throw new Error(`seed-shared-model-room failed (${res.status()}): ${await res.text()}`);
  }
  return (await res.json()) as { modelId: string; roomId: string };
}

/**
 * Facilitator starts a stage from the session page via the "Start this
 * session" button in the stage's timer cluster. Participant "Start your
 * model" buttons are disabled while a stage is pending, so specs that drive
 * a participant's model creation must start the stage first.
 */
export async function startStage(
  facilitatorPage: Page,
  sessionId: string,
  stageType: string,
): Promise<void> {
  await facilitatorPage.goto(`/app/sessions/${sessionId}`);
  const card = facilitatorPage.getByTestId(`stage-card-${stageType}`);
  await card.getByRole('button', { name: /^start this session$/i }).click();
  // Pause appearing confirms the start landed server-side.
  await expect(card.getByRole('button', { name: /^pause$/i })).toBeVisible({ timeout: 5000 });
}

// Canonical "drop the first piece onto the canvas" helper. Opens the pieces
// drawer, drags piece-card[0] to (offsetX, offsetY) inside the canvas, then
// Escape-closes the drawer and waits for it to hide. The close step matters:
// since 2026-08-05 the OPEN drawer stacks at z-40 ABOVE the canvas chrome
// (Share/Export/Notes buttons at z-30), so any post-drop chrome click is
// refused by Playwright's actionability check before the drawer's
// light-dismiss pointerdown can fire. Specs must use this instead of local
// copies — the drawer-occlusion rot class came from exactly such copies.
export async function dropFirstBrickAt(
  page: Page,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  await page.getByRole('button', { name: /open pieces/i }).click();
  const piece = page.getByTestId('piece-card').nth(0);
  const canvas = page.getByTestId('builder-canvas');
  await piece.waitFor();
  await canvas.waitFor();
  const pieceBox = await piece.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!pieceBox || !canvasBox) throw new Error('measurement failed');
  await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + offsetX, canvasBox.y + offsetY, { steps: 12 });
  await page.mouse.up();
  // Close the drawer so it stops covering the top-right chrome. Escape is
  // handled by a document-level listener; the closed panel drops to
  // pointer-events-none immediately (class swap), so no transition wait.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pieces-drawer-panel')).toHaveAttribute('aria-hidden', 'true');
}

export const test = base.extend<Fixtures>({
  signedInEmail: async ({}, use) => {
    await use(makeTestEmail());
  },
  signedInPage: async ({ page, signedInEmail }, use) => {
    // Suppress first-run overlays by default — every other spec assumes a
    // "returning user" UI without the welcome modal / spotlight tour /
    // consent card overlaying it. Overlay-specific specs clear the relevant
    // key in their own beforeEach (a second addInitScript runs after this
    // one and selectively removes it).
    await suppressFirstRunOverlays(page);
    const res = await page.request.post('/api/test/sign-in', {
      data: { email: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Test sign-in failed (${res.status()}): ${await res.text()}`);
    }
    const signInBody = (await res.json()) as { userId?: string | null };
    const userId = signInBody.userId ?? null;
    try {
      await use(page);
    } finally {
      if (userId) {
        const cleanupRes = await page.request.post('/api/test/delete-user', {
          data: { userId },
        });
        if (!cleanupRes.ok()) {
          console.warn(
            `[e2e] cleanup failed for ${signedInEmail} (${userId}): ${cleanupRes.status()} ${await cleanupRes.text()}`,
          );
        }
      }
    }
  },
  siteAdminPage: async ({ signedInPage, signedInEmail }, use) => {
    // Reuse the already-signed-in page (and its fresh user + cleanup), then
    // flip is_site_admin on that user's profile. The route gates on the same
    // host + E2E_AUTH_ENABLED + test-email checks as the other test routes.
    const res = await signedInPage.request.post('/api/test/promote-site-admin', {
      data: { email: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Promote site admin failed (${res.status()}): ${await res.text()}`);
    }
    await use(signedInPage);
  },
  seededSession: async ({ signedInPage, signedInEmail }, use) => {
    const res = await signedInPage.request.post('/api/test/seed-session', {
      data: { callerEmail: signedInEmail },
    });
    if (!res.ok()) {
      throw new Error(`Seed session failed (${res.status()}): ${await res.text()}`);
    }
    const body = (await res.json()) as Fixtures['seededSession'];
    await use(body);
  },
});

export { expect };
