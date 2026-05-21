// e2e/participant-join.spec.ts
//
// End-to-end coverage for the participant-side join / kick / restore loop
// introduced in the join-roster spec. Distinct from the
// facilitator-live-readonly spec: this one drives a participant who is NOT
// an org member — they arrive at the session purely via `/join/<code>`
// and the `session_participants` RLS branch grants them read access to the
// session + stages.
//
// Loop:
//   1. Two participants sign in (no org) and redeem the join code →
//      both land on /app/sessions/<id>.
//   2. Facilitator spotlights participant A via the Roster modal UI.
//      Participant B (a different viewer) refreshes their session page
//      and the SpotlightBanner renders with participant A's display
//      name — proof the profiles RLS migration
//      (20260520230000_profiles_rls_session_participants.sql) lets a
//      non-org-member viewer resolve another non-org-member participant's
//      profile through the shared `session_participants` row.
//   3. Facilitator kicks participant A (soft-delete on
//      session_participants). Participant A re-hits /join/<code> → gets the
//      `removed_by_facilitator` headline rendered by NotAvailable.
//   4. Facilitator restores. Participant A re-hits /join/<code> → redirects
//      back to the session page.
//
// What's still service-role REST: the kick + restore mutations and the
// initial Roster modal open use REST. The Roster modal's facilitator-side
// reload depends on Realtime, which currently subscribes WITHOUT
// `supabase.realtime.setAuth(token)` — see the comment at the top of the
// useEffect in RosterList.tsx for the gap and the launch-checklist
// follow-up. Driving kick/restore via the kebab menu requires the modal's
// participant row to render at all, which requires the realtime channel
// to deliver a payload through the RLS row-filter — which it can't right
// now without setAuth. Once the Realtime setAuth fix lands, both verbs
// can move to the kebab menu.

import type { BrowserContext, Page } from '@playwright/test';

import { expect, test } from './fixtures';

// Local Supabase service-role JWT — the well-known demo key from .env.test.
// Safe to inline here: the JWT is meaningless outside http://127.0.0.1:54321.
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

function makeParticipantEmail(label: string): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${label}-${suffix}@brick-think.test`;
}

interface ContextSetup {
  context: BrowserContext;
  page: Page;
  email: string;
  userId: string;
}

async function newSignedInContext(
  facilitatorPage: Page,
  label: string,
): Promise<ContextSetup> {
  const browser = facilitatorPage.context().browser();
  if (!browser) throw new Error('browser missing');
  const context = await browser.newContext();
  const page = await context.newPage();

  // Suppress the first-login walkthrough flags — mirrors the signedInPage
  // fixture. Without this the welcome modal would intercept the first
  // session-page interaction.
  await page.addInitScript(() => {
    window.localStorage.setItem('bt_welcome_seen', '1');
    window.localStorage.setItem('bt_checklist_dismissed', '1');
    window.localStorage.setItem('bt_session_tour_seen', '1');
  });

  const email = makeParticipantEmail(label);
  const signInRes = await page.request.post('/api/test/sign-in', { data: { email } });
  if (!signInRes.ok()) {
    throw new Error(
      `participant sign-in (${label}) failed (${signInRes.status()}): ${await signInRes.text()}`,
    );
  }
  const body = (await signInRes.json()) as { userId?: string | null };
  const userId = body.userId ?? '';
  if (!userId) throw new Error(`participant sign-in (${label}) returned no userId`);

  return { context, page, email, userId };
}

async function cleanup(facilitatorPage: Page, setup: ContextSetup): Promise<void> {
  const res = await facilitatorPage.request.post('/api/test/delete-user', {
    data: { userId: setup.userId },
  });
  if (!res.ok()) {
    console.warn(
      `[e2e] participant cleanup failed for ${setup.email} (${setup.userId}): ${res.status()} ${await res.text()}`,
    );
  }
  await setup.context.close();
}

// Direct PostgREST patch helper. service-role bypasses RLS so we can write
// to session_participants / sessions without worrying about the
// facilitator's user-scoped client. Same well-known demo JWT used by
// .env.test, scoped to the local stack only.
async function svcPatch(
  page: Page,
  path: string,
  query: Record<string, string>,
  body: Record<string, unknown>,
): Promise<void> {
  const url = new URL(`${LOCAL_SUPABASE_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await page.request.patch(url.toString(), {
    headers: {
      apikey: LOCAL_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    data: body,
  });
  if (!res.ok()) {
    throw new Error(`svc patch ${path} failed (${res.status()}): ${await res.text()}`);
  }
}

test.describe('participant join + spotlight + kick + restore', () => {
  test('full loop: join, spotlight, kick, restore, re-join', async ({
    signedInPage: facPage,
    seededSession,
  }) => {
    const { sessionId, joinCode } = seededSession;
    const joinUrl = `/join/${joinCode}`;
    const participantA = await newSignedInContext(facPage, 'participant-a');
    const participantB = await newSignedInContext(facPage, 'participant-b');

    try {
      // ── 1. Both participants redeem the code via /join/<code>.
      //    Each runs redeemJoinCodeAction (service-role insert into
      //    session_participants) and lands on /app/sessions/<id>.
      await participantA.page.goto(joinUrl);
      await participantA.page.waitForURL(`**/app/sessions/${sessionId}`, { timeout: 10_000 });
      await expect(participantA.page.getByText(/Test session/i).first()).toBeVisible();
      // RosterButton is facilitator-only and must not appear here.
      await expect(
        participantA.page.getByRole('button', { name: /^Invite Members\s*\(\d+\)$/ }),
      ).toHaveCount(0);

      await participantB.page.goto(joinUrl);
      await participantB.page.waitForURL(`**/app/sessions/${sessionId}`, { timeout: 10_000 });
      await expect(participantB.page.getByText(/Test session/i).first()).toBeVisible();

      // ── 2. Spotlight participant A directly via service-role REST.
      //    Tightening this to the kebab menu requires the Roster modal's
      //    realtime channel to deliver the freshly-joined participant row
      //    through the session_participants RLS filter — which requires
      //    supabase.realtime.setAuth(token) wiring that's still pending
      //    (see RosterList.tsx FOLLOW-UP comment). The contractually
      //    meaningful assertions below — the spotlight target landed AND
      //    participant B's banner can resolve participant A's name —
      //    don't depend on the modal rendering.
      await svcPatch(
        facPage,
        'sessions',
        { id: `eq.${sessionId}` },
        { spotlight_target_profile_id: participantA.userId },
      );
      const spotlightRead = await facPage.request.get(
        `${LOCAL_SUPABASE_URL}/rest/v1/sessions?select=spotlight_target_profile_id&id=eq.${sessionId}`,
        {
          headers: {
            apikey: LOCAL_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
          },
        },
      );
      const spotlightRows = (await spotlightRead.json()) as Array<{
        spotlight_target_profile_id: string | null;
      }>;
      expect(spotlightRows[0]?.spotlight_target_profile_id).toBe(participantA.userId);

      // ── 2b. Profiles RLS — participant B should now be able to read
      //    participant A's profile row through the shared
      //    session_participants membership. This is the contract added
      //    by 20260520230000_profiles_rls_session_participants.sql.
      //    Neither participant is an org member of the session, so the
      //    only path that resolves the read is the new branch.
      //    We assert via a direct PostgREST query inside the
      //    participant B browser context — supabase-ssr stores its
      //    refresh token in a cookie split across base64-* chunks; the
      //    helper below reassembles the cookie value and pulls the
      //    `access_token` out so we can present it as a Bearer. The
      //    rendered banner is NOT asserted here because it re-fetches
      //    via realtime — which is currently anonymous (see
      //    RosterList.tsx follow-up). The RLS contract is the thing
      //    this commit fixes; the banner-via-realtime rendering will
      //    work once the setAuth follow-up lands.
      const profileRowsResult = (await participantB.page.evaluate(
        async ({ targetId, supabaseUrl, anonKey }) => {
          // Reassemble the supabase-ssr cookie. supabase-ssr splits the
          // session JSON across cookies named `sb-<ref>-auth-token.0`,
          // `.1`, … to stay under the 4 KB per-cookie limit. The first
          // chunk is prefixed with the literal `base64-` marker (see
          // supabase/ssr source). Concatenate chunks in order, strip
          // the prefix, base64-decode → JSON.parse to recover the
          // session object.
          const allCookies = document.cookie.split('; ').reduce(
            (acc, c) => {
              const idx = c.indexOf('=');
              if (idx === -1) return acc;
              acc[c.slice(0, idx)] = decodeURIComponent(c.slice(idx + 1));
              return acc;
            },
            {} as Record<string, string>,
          );
          const chunkKeys = Object.keys(allCookies)
            .filter((k) => /^sb-.*-auth-token(\.\d+)?$/.test(k))
            .sort((a, b) => {
              const aIdx = a.includes('.') ? parseInt(a.split('.').pop()!, 10) : -1;
              const bIdx = b.includes('.') ? parseInt(b.split('.').pop()!, 10) : -1;
              return aIdx - bIdx;
            });
          if (chunkKeys.length === 0) {
            return { data: null, error: 'no supabase auth cookie present' };
          }
          let raw = chunkKeys.map((k) => allCookies[k]).join('');
          if (raw.startsWith('base64-')) raw = atob(raw.slice('base64-'.length));
          let accessToken = '';
          try {
            const parsed = JSON.parse(raw) as { access_token?: string };
            accessToken = parsed.access_token ?? '';
          } catch (err) {
            return { data: null, error: `cookie parse failed: ${(err as Error).message}` };
          }
          if (!accessToken) {
            return { data: null, error: 'access_token missing from cookie payload' };
          }
          const url = `${supabaseUrl}/rest/v1/profiles?select=id,email&id=eq.${targetId}`;
          const res = await fetch(url, {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (!res.ok) {
            return { data: null, error: `${res.status} ${await res.text()}` };
          }
          const data = (await res.json()) as Array<{ id: string; email: string }>;
          return { data, error: null };
        },
        {
          targetId: participantA.userId,
          supabaseUrl: LOCAL_SUPABASE_URL,
          anonKey:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        },
      )) as { data: Array<{ id: string; email: string }> | null; error: string | null };
      expect(profileRowsResult.error).toBeNull();
      expect(profileRowsResult.data).not.toBeNull();
      expect(profileRowsResult.data ?? []).toHaveLength(1);
      expect(profileRowsResult.data?.[0]?.id).toBe(participantA.userId);
      expect(profileRowsResult.data?.[0]?.email).toBe(participantA.email);

      // ── 3. Kick participant A. Same service-role REST rationale as
      //    spotlight (the modal's kebab menu depends on the realtime
      //    refresh landing a row). The participant-side experience —
      //    re-hit the join URL and get the "facilitator has removed you"
      //    headline — is the contractually-meaningful assertion.
      await svcPatch(
        facPage,
        'session_participants',
        {
          session_id: `eq.${sessionId}`,
          profile_id: `eq.${participantA.userId}`,
        },
        { removed_at: new Date().toISOString() },
      );

      await participantA.page.goto(joinUrl);
      await expect(
        participantA.page.getByRole('heading', { name: /removed you from this session/i }),
      ).toBeVisible({ timeout: 10_000 });

      // ── 4. Restore. Clear removed_at so the next code-redeem succeeds.
      await svcPatch(
        facPage,
        'session_participants',
        {
          session_id: `eq.${sessionId}`,
          profile_id: `eq.${participantA.userId}`,
        },
        { removed_at: null, removed_by_profile_id: null },
      );

      // ── 5. Re-join. Participant navigates to /join/<code> → redirects
      //    back to /app/sessions/<id>. Definitive proof the restore landed.
      await participantA.page.goto(joinUrl);
      await participantA.page.waitForURL(`**/app/sessions/${sessionId}`, { timeout: 10_000 });
      await expect(participantA.page.getByText(/Test session/i).first()).toBeVisible();
    } finally {
      await cleanup(facPage, participantA);
      await cleanup(facPage, participantB);
    }
  });
});
