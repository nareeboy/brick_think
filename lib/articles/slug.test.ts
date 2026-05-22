import { describe, expect, it } from 'vitest';

import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips non-alphanumerics and collapses runs', () => {
    expect(slugify("BrickThink's CMS — v1.0!")).toBe('brickthink-s-cms-v1-0');
  });
  it('trims leading and trailing hyphens', () => {
    expect(slugify('---foo bar---')).toBe('foo-bar');
  });
  it('caps at 120 chars', () => {
    expect(slugify('a'.repeat(200)).length).toBe(120);
  });
});

describe('isValidSlug', () => {
  it.each(['hello-world', 'cms', 'a1b2', 'one-two-three-4'])('accepts %s', (s) => {
    expect(isValidSlug(s)).toBe(true);
  });
  it.each(['', '-foo', 'foo-', 'Foo', 'foo--bar', 'foo bar', 'foo/bar'])('rejects %s', (s) => {
    expect(isValidSlug(s)).toBe(false);
  });
});
