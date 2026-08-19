import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendTransactionalEmail } from './resend';

const EMAIL = {
  to: 'priya@example.com',
  subject: 'Test subject',
  html: '<p>Hello</p>',
  text: 'Hello',
};

describe('sendTransactionalEmail', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('skips silently without calling Resend when RESEND_API_KEY is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const result = await sendTransactionalEmail(EMAIL);
    expect(result).toEqual({ sent: false, reason: 'no_api_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the email to Resend with the API key and returns sent', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_ADDRESS', 'BrickThink <hello@example.com>');
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const result = await sendTransactionalEmail(EMAIL);

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer re_test_key' }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body).toMatchObject({
      from: 'BrickThink <hello@example.com>',
      to: ['priya@example.com'],
      subject: 'Test subject',
    });
  });

  it('prefers a per-email from override over RESEND_FROM_ADDRESS', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_ADDRESS', 'BrickThink <hello@example.com>');
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await sendTransactionalEmail({ ...EMAIL, from: 'BrickThink <workshops@example.com>' });

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.from).toBe('BrickThink <workshops@example.com>');
  });

  it('falls back to the default from-address when RESEND_FROM_ADDRESS is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM_ADDRESS', '');
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await sendTransactionalEmail(EMAIL);

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.from).toBe('BrickThink <notifications@brickthink.io>');
  });

  it('surfaces a non-2xx Resend response as a reason code', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    fetchMock.mockResolvedValue({ ok: false, status: 502 });

    const result = await sendTransactionalEmail(EMAIL);
    expect(result).toEqual({ sent: false, reason: 'resend_502' });
  });

  it('surfaces a thrown fetch as a network error', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    fetchMock.mockRejectedValue(new Error('boom'));

    const result = await sendTransactionalEmail(EMAIL);
    expect(result).toEqual({ sent: false, reason: 'network_error' });
  });
});
