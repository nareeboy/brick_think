import { describe, expect, it } from 'vitest';

import { loadBannerProfile, resolveDisplayName } from './displayName';
import type { ServerSupabaseClient } from '@/lib/db/server';

describe('resolveDisplayName', () => {
  it('prefers the display name the user set on their profile', () => {
    expect(resolveDisplayName({ full_name: 'Ada Lovelace', email: 'ada@example.com' })).toBe(
      'Ada Lovelace',
    );
  });

  it('falls back to the email address when the display name is unset', () => {
    expect(resolveDisplayName({ full_name: null, email: 'ada@example.com' })).toBe(
      'ada@example.com',
    );
  });

  it('treats a whitespace-only display name as unset', () => {
    expect(resolveDisplayName({ full_name: '   ', email: 'ada@example.com' })).toBe(
      'ada@example.com',
    );
  });

  it('falls back to the auth user email when the profile row has neither', () => {
    expect(resolveDisplayName({ full_name: null, email: null }, 'ada@example.com')).toBe(
      'ada@example.com',
    );
  });

  it('is null when nothing identifies the account', () => {
    expect(resolveDisplayName(null)).toBeNull();
    expect(resolveDisplayName({ full_name: '', email: '' }, '  ')).toBeNull();
  });
});

function stubSupabase(
  row: {
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null,
): ServerSupabaseClient {
  // Partial mock: loadBannerProfile only touches the profiles select chain;
  // the full ServerSupabaseClient surface is irrelevant here.
  // eslint-disable-next-line no-restricted-syntax
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row }),
        }),
      }),
    }),
  } as unknown as ServerSupabaseClient;
}

describe('loadBannerProfile', () => {
  const user = { id: 'user-1', email: 'auth@example.com' };

  it('returns the profile display name and avatar URL', async () => {
    const supabase = stubSupabase({
      full_name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar_url: 'https://cdn.example.com/avatar.png?v=1',
    });
    expect(await loadBannerProfile(supabase, user)).toEqual({
      displayName: 'Ada Lovelace',
      avatarUrl: 'https://cdn.example.com/avatar.png?v=1',
    });
  });

  it('degrades to the auth email and no avatar when the profile row is missing', async () => {
    expect(await loadBannerProfile(stubSupabase(null), user)).toEqual({
      displayName: 'auth@example.com',
      avatarUrl: null,
    });
  });

  it('returns no identity at all when nothing identifies the account', async () => {
    expect(await loadBannerProfile(stubSupabase(null), { id: 'user-1' })).toEqual({
      displayName: null,
      avatarUrl: null,
    });
  });
});
