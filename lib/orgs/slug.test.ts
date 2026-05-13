import { describe, expect, it } from 'vitest';

import { isValidSlug, suggestSlug } from './slug';

describe('suggestSlug', () => {
  it('lowercases and replaces non-alphanumerics with hyphens', () => {
    expect(suggestSlug('Acme Inc')).toBe('acme-inc');
    expect(suggestSlug('Brick Think Co.')).toBe('brick-think-co');
  });

  it('collapses runs of hyphens', () => {
    expect(suggestSlug('  hello   world  ')).toBe('hello-world');
    expect(suggestSlug('foo --- bar')).toBe('foo-bar');
  });

  it('strips leading and trailing hyphens', () => {
    expect(suggestSlug('-leading-')).toBe('leading');
    expect(suggestSlug('!!odd!!')).toBe('odd');
  });

  it('truncates to 40 characters at a hyphen boundary when possible', () => {
    const long = 'a'.repeat(45);
    expect(suggestSlug(long)).toHaveLength(40);
  });

  it('returns empty string when input collapses to nothing', () => {
    expect(suggestSlug('   ')).toBe('');
    expect(suggestSlug('!!!')).toBe('');
  });
});

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('acme')).toBe(true);
    expect(isValidSlug('acme-inc')).toBe(true);
    expect(isValidSlug('a1')).toBe(true);
  });

  it('rejects too-short, too-long, or malformed slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('a')).toBe(false);
    expect(isValidSlug('-acme')).toBe(false);
    expect(isValidSlug('acme-')).toBe(false);
    expect(isValidSlug('Acme')).toBe(false);
    expect(isValidSlug('acme_inc')).toBe(false);
    expect(isValidSlug('a'.repeat(41))).toBe(false);
  });
});
