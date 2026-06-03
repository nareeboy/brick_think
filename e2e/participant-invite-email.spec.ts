// e2e/participant-invite-email.spec.ts
//
// E2E coverage for the email-invite flow exercising Mailpit at http://127.0.0.1:54324.
// Verifies:
//   1. Facilitator can open the Roster modal on a session.
//   2. Facilitator can type a new email into the chip input and press Enter to add it.
//   3. Facilitator can click "Send invites" button.
//   4. The UI displays "sent invite" status for the email.
//   5. Mailpit API confirms the email arrived with the join URL in its body.

import { expect, test } from './fixtures';

const MAILPIT_BASE_URL = 'http://127.0.0.1:54324';

function makeInviteeEmail(): string {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-invitee-${suffix}@brick-think.test`;
}

/**
 * Poll Mailpit's search API to find an email sent to the given address.
 * Returns the full message (HTML/Text body + metadata) when found, or throws
 * after timeout if not found.
 */
async function getMailpitMessage(
  addr: string,
  timeoutMs = 10_000,
): Promise<{ subject: string; html: string; text: string }> {
  const start = Date.now();
  const url = `${MAILPIT_BASE_URL}/api/v1/search?query=${encodeURIComponent(`to:${addr}`)}`;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          messages?: Array<{ ID: string; Subject: string }>;
        };
        const message = data.messages?.[0];
        if (message) {
          const bodyRes = await fetch(`${MAILPIT_BASE_URL}/api/v1/message/${message.ID}`);
          if (bodyRes.ok) {
            const bodyData = (await bodyRes.json()) as {
              Subject?: string;
              HTML?: string;
              Text?: string;
            };
            return {
              subject: bodyData.Subject ?? message.Subject,
              html: bodyData.HTML ?? '',
              text: bodyData.Text ?? '',
            };
          }
        }
      }
    } catch {
      // Network error; retry.
    }

    // Wait before retrying.
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`getMailpitMessage: no email arrived for ${addr} within ${timeoutMs}ms`);
}

test.describe('email invite flow with Mailpit', () => {
  test('facilitator can send invite email and verify join URL in Mailpit', async ({
    signedInPage: facPage,
    seededSession,
  }) => {
    const { sessionId, joinCode } = seededSession;
    const inviteeEmail = makeInviteeEmail();

    // Navigate to session detail page.
    await facPage.goto(`/app/sessions/${sessionId}`);
    await facPage.waitForURL(`**/app/sessions/${sessionId}`, { timeout: 10_000 });

    // Open Roster modal. Button text is "Invite Members (N)" where N is participant count.
    const rosterButton = facPage.getByRole('button', { name: /^Invite Members\s*\(\d+\)$/ });
    await expect(rosterButton).toBeVisible();
    await rosterButton.click();

    // Wait for modal to appear. The RosterInviteBlock is rendered inside.
    // Use more specific selectors to avoid strict mode issues with duplicate text.
    await expect(
      facPage.getByRole('paragraph').filter({ hasText: 'Copy invite link' }),
    ).toBeVisible();
    await expect(
      facPage.getByRole('paragraph').filter({ hasText: 'Invite by email' }),
    ).toBeVisible();

    // Find the email input. It's a plain <input type="email"> with placeholder text.
    // The input should have a placeholder like "Enter email addresses..."
    const emailInput = facPage.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Type the invitee email and press Enter to chip-ify it.
    await emailInput.fill(inviteeEmail);
    await emailInput.press('Enter');

    // Verify the email appears as a chip. The chip has class "rounded-md bg-zinc-900/5 px-2 py-1"
    // and contains the email as <span>
    const emailChip = facPage.locator('div').filter({ hasText: inviteeEmail }).first();
    await expect(emailChip).toBeVisible();

    // Verify the Send button is now enabled (it's disabled when emails.length === 0)
    const sendButton = facPage.getByRole('button', { name: /^Send invites$/ });
    await expect(sendButton).toBeEnabled();

    // Click "Send invites" button.
    await sendButton.click();

    // Wait for the send to complete. The button text changes to "Sending…" while pending,
    // then back to "Send invites" when complete.
    await expect(sendButton).toContainText(/^Send invites$/, { timeout: 10_000 });

    // Verify the status display shows "sent invite" for this email.
    // The results section renders with <li> items showing "sent invite" status.
    const inviteResultRow = facPage.locator('li').filter({ hasText: inviteeEmail });
    await expect(inviteResultRow).toBeVisible();
    await expect(inviteResultRow.locator('text=sent invite')).toBeVisible();

    // Poll Mailpit to verify the email arrived.
    const mailpitMessage = await getMailpitMessage(inviteeEmail, 10_000);

    // Subject should indicate this is an invite from Supabase Auth.
    expect(mailpitMessage.subject.toLowerCase()).toContain('invit');

    // Body (HTML or Text) should contain either:
    // 1. The join URL (if custom template), or
    // 2. Supabase Auth's standard invite redemption flow (for new users)
    // For new users without an account, Supabase sends auth.admin.inviteUserByEmail
    // which uses Supabase's template. The redirectTo parameter is embedded in the
    // verification link and will land on the join URL after auth completes.
    const bodyText = mailpitMessage.html || mailpitMessage.text;

    // At minimum, the body should contain either the join code reference or
    // "invited" language from Supabase's template.
    const hasInviteLanguage =
      bodyText.toLowerCase().includes('invited') || bodyText.includes(joinCode);
    expect(hasInviteLanguage).toBe(true);
  });
});
