// e2e/magic-link-token-hash.spec.ts
//
// Verifies the sign-in magic-link path uses the token-hash strategy
// (not PKCE), so the link works when opened in a different browser
// context than the one that requested it. The historical PKCE flow
// failed with "PKCE code verifier not found in storage" in that case.
//
// Coverage:
//   1. Submitting the form sends a Mailpit-visible email
//   2. The link in the email points at /auth/confirm with token_hash and type=magiclink
//   3. Opening the link in a FRESH browser context (no cookies from the form
//      submission) still authenticates the user and lands them on /app/my-designs

import { expect, test } from '@playwright/test';

const MAILPIT_BASE_URL = 'http://127.0.0.1:54324';

function makeTestEmail(): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-mlth-${suffix}@brick-think.test`;
}

async function getLatestMailpitMessage(
  addr: string,
  timeoutMs = 15_000,
): Promise<{ html: string; text: string }> {
  const start = Date.now();
  const url = `${MAILPIT_BASE_URL}/api/v1/search?query=${encodeURIComponent(`to:${addr}`)}`;

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { messages?: Array<{ ID: string }> };
      const message = data.messages?.[0];
      if (message) {
        const bodyRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${message.ID}`);
        if (bodyRes.ok) {
          const body = (await bodyRes.json()) as { HTML?: string; Text?: string };
          return { html: body.HTML ?? '', text: body.Text ?? '' };
        }
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`getLatestMailpitMessage: no email arrived for ${addr} within ${timeoutMs}ms`);
}

function extractAuthLink(emailBody: string): string {
  // The custom magic_link template builds the link as:
  //   {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink
  // Pick the first /auth/confirm URL that carries a token_hash.
  const re = /https?:\/\/[^"'\s<>]*\/auth\/confirm[^"'\s<>]*token_hash=[^"'\s<>&]+[^"'\s<>]*/;
  const match = emailBody.match(re);
  if (!match) throw new Error(`No /auth/confirm token_hash URL found in email body:\n${emailBody}`);
  // Mailpit returns HTML with &amp; encoded; normalise back to & so URL parsing works.
  return match[0].replace(/&amp;/g, '&');
}

test.describe('sign-in magic link uses token-hash flow', () => {
  test('email contains /auth/confirm + token_hash; link authenticates in a fresh browser', async ({
    page,
    browser,
  }) => {
    const email = makeTestEmail();

    // 1. Submit the sign-in form from one browser context.
    await page.goto('/sign-in');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole('button', { name: /send sign-in link/i }).click();
    await expect(page.getByText(/Sign-in link sent/i)).toBeVisible({ timeout: 10_000 });

    // 2. Pull the email and assert the link uses /auth/confirm with token_hash.
    const message = await getLatestMailpitMessage(email);
    const body = message.html || message.text;
    expect(body).toContain('/auth/confirm');
    expect(body).toMatch(/token_hash=/);
    expect(body).toMatch(/type=magiclink/);

    const authUrl = extractAuthLink(body);

    // 3. Open the link in a FRESH browser context (no shared cookies / storage).
    // Under the old PKCE flow this would fail with "PKCE code verifier not
    // found in storage" — that's the bug this spec defends against.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    try {
      await freshPage.goto(authUrl);
      await expect(freshPage).toHaveURL(/\/app\/my-designs/, { timeout: 10_000 });
    } finally {
      await freshContext.close();
    }
  });
});
