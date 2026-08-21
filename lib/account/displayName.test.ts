import { describe, expect, it } from 'vitest';

import { resolveDisplayName } from './displayName';

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
