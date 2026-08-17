import { beforeEach, describe, expect, it, vi } from 'vitest';

let adminPanelEnabled = false;
vi.mock('@/lib/premium/server', () => ({
  get adminPanelEnabled() {
    return adminPanelEnabled;
  },
}));

import type { ServerSupabaseClient } from '@/lib/db/server';

import { DEFAULT_POST_LOGIN_PATH, resolvePostLoginDestination } from './postLoginDestination';

function makeSupabase(opts: { userId: string | null; isSiteAdmin?: boolean }) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.isSiteAdmin === undefined ? null : { is_site_admin: opts.isSiteAdmin },
    error: null,
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.userId ? { id: opts.userId } : null },
  });
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
  }));
  return {
    // Partial mock: the helper only touches auth.getUser and the profiles
    // select chain; the full ServerSupabaseClient surface is irrelevant here.
    // eslint-disable-next-line no-restricted-syntax
    client: { auth: { getUser }, from } as unknown as ServerSupabaseClient,
    getUser,
    from,
  };
}

describe('resolvePostLoginDestination', () => {
  beforeEach(() => {
    adminPanelEnabled = false;
  });

  it('passes an explicit non-default next through without querying supabase', async () => {
    adminPanelEnabled = true;
    const { client, getUser } = makeSupabase({ userId: 'u1', isSiteAdmin: true });

    const dest = await resolvePostLoginDestination(client, '/app/sessions/abc');

    expect(dest).toBe('/app/sessions/abc');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('keeps the default destination when the admin panel is disabled (open-core stub)', async () => {
    const { client, getUser } = makeSupabase({ userId: 'u1', isSiteAdmin: true });

    const dest = await resolvePostLoginDestination(client, DEFAULT_POST_LOGIN_PATH);

    expect(dest).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('sends a site admin to /app/admin when the panel is enabled and next is the default', async () => {
    adminPanelEnabled = true;
    const { client } = makeSupabase({ userId: 'u1', isSiteAdmin: true });

    const dest = await resolvePostLoginDestination(client, DEFAULT_POST_LOGIN_PATH);

    expect(dest).toBe('/app/admin');
  });

  it('keeps the default destination for a non-admin user', async () => {
    adminPanelEnabled = true;
    const { client } = makeSupabase({ userId: 'u1', isSiteAdmin: false });

    const dest = await resolvePostLoginDestination(client, DEFAULT_POST_LOGIN_PATH);

    expect(dest).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it('keeps the default destination when no user session is present', async () => {
    adminPanelEnabled = true;
    const { client, from } = makeSupabase({ userId: null });

    const dest = await resolvePostLoginDestination(client, DEFAULT_POST_LOGIN_PATH);

    expect(dest).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(from).not.toHaveBeenCalled();
  });

  it('keeps the default destination when the profile row is missing', async () => {
    adminPanelEnabled = true;
    const { client } = makeSupabase({ userId: 'u1' });

    const dest = await resolvePostLoginDestination(client, DEFAULT_POST_LOGIN_PATH);

    expect(dest).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});
