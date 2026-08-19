import 'server-only';

/**
 * Generic transactional email sender, delivered through Resend's HTTP API
 * with a plain `fetch` — deliberately no SDK dependency for a single POST
 * endpoint.
 *
 * Env:
 *  - RESEND_API_KEY      — unset (all self-hosters, local dev, E2E) means email
 *                          is skipped silently; callers treat send as
 *                          best-effort and never fail their action on it.
 *  - RESEND_FROM_ADDRESS — verified sender, shared with every other Resend
 *                          email the app sends; defaults below.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'BrickThink <notifications@brickthink.io>';

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Verified sender override; falls back to RESEND_FROM_ADDRESS, then the default. */
  from?: string;
}

export type SendResult = { sent: true } | { sent: false; reason: string };

export async function sendTransactionalEmail(email: TransactionalEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('sendTransactionalEmail: RESEND_API_KEY unset — email skipped');
    return { sent: false, reason: 'no_api_key' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: email.from || process.env.RESEND_FROM_ADDRESS || DEFAULT_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) {
      console.error(`sendTransactionalEmail: Resend responded ${res.status}`);
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('sendTransactionalEmail: request failed', err);
    return { sent: false, reason: 'network_error' };
  }
}
