/**
 * "You've been added to a workshop" email, sent to an already-registered user
 * when a workshop member adds them by email (the unknown-address path gets a
 * Supabase Auth invite email instead — this covers the known-user branch,
 * which previously only produced an in-app bell notification).
 */

export interface OrgAddedEmailArgs {
  /** Recipient display name, or null for a generic greeting. */
  recipientName: string | null;
  actorDisplay: string;
  orgName: string;
  /** Absolute URL of the workshop page. */
  workshopUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildOrgAddedEmail(args: OrgAddedEmailArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = args.recipientName ? `Hi ${args.recipientName},` : 'Hi,';
  const subject = `${args.actorDisplay} added you to ${args.orgName} on BrickThink`;

  const text = [
    greeting,
    '',
    `${args.actorDisplay} added you to the workshop "${args.orgName}" on BrickThink.`,
    'Open the workshop here:',
    args.workshopUrl,
    '',
    '— BrickThink',
  ].join('\n');

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(args.actorDisplay)} added you to the workshop &quot;${escapeHtml(args.orgName)}&quot; on BrickThink.</p>`,
    `<p><a href="${escapeHtml(args.workshopUrl)}">Open the workshop</a></p>`,
    `<p>— BrickThink</p>`,
  ].join('\n');

  return { subject, html, text };
}
