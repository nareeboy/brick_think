import { describe, expect, it } from 'vitest';

import { buildOrgAddedEmail } from './orgAdded';

const BASE_ARGS = {
  recipientName: 'Priya',
  actorDisplay: 'Naresh',
  orgName: 'Acme Workshop',
  workshopUrl: 'https://www.brickthink.io/app/workshops/abc-123',
};

describe('buildOrgAddedEmail', () => {
  it('puts the actor and workshop name in the subject', () => {
    const email = buildOrgAddedEmail(BASE_ARGS);
    expect(email.subject).toBe('Naresh added you to Acme Workshop on BrickThink');
  });

  it('greets the recipient by name and links the workshop in the text body', () => {
    const email = buildOrgAddedEmail(BASE_ARGS);
    expect(email.text).toContain('Hi Priya,');
    expect(email.text).toContain(BASE_ARGS.workshopUrl);
  });

  it('falls back to a generic greeting when the recipient has no name', () => {
    const email = buildOrgAddedEmail({ ...BASE_ARGS, recipientName: null });
    expect(email.text).toContain('Hi,');
    expect(email.text).not.toContain('Hi null');
  });

  it('links the workshop in the HTML body', () => {
    const email = buildOrgAddedEmail(BASE_ARGS);
    expect(email.html).toContain(`href="${BASE_ARGS.workshopUrl}"`);
  });

  it('HTML-escapes user-controlled values in the HTML body', () => {
    const email = buildOrgAddedEmail({
      ...BASE_ARGS,
      orgName: '<script>alert(1)</script>',
      actorDisplay: 'Ann & Bob',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('Ann &amp; Bob');
  });
});
