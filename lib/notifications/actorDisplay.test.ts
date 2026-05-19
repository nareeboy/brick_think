import { describe, expect, it } from 'vitest';

import { resolveActorDisplay } from './actorDisplay';

describe('resolveActorDisplay', () => {
  it('prefers full_name when distinct from email local part', () => {
    expect(resolveActorDisplay({ fullName: 'Naresh Shan', email: 'naresh@brickthink.io' })).toBe(
      'Naresh Shan',
    );
  });

  it('falls back to email when full_name matches the local part (case-insensitive)', () => {
    expect(resolveActorDisplay({ fullName: 'Naresh', email: 'naresh@brickthink.io' })).toBe(
      'naresh@brickthink.io',
    );
    expect(resolveActorDisplay({ fullName: 'NARESH', email: 'naresh@brickthink.io' })).toBe(
      'naresh@brickthink.io',
    );
  });

  it('falls back to email when full_name is null/empty/whitespace', () => {
    expect(resolveActorDisplay({ fullName: null, email: 'a@b.com' })).toBe('a@b.com');
    expect(resolveActorDisplay({ fullName: '', email: 'a@b.com' })).toBe('a@b.com');
    expect(resolveActorDisplay({ fullName: '   ', email: 'a@b.com' })).toBe('a@b.com');
  });

  it('returns "Someone" when both name and email are missing', () => {
    expect(resolveActorDisplay({ fullName: null, email: null })).toBe('Someone');
    expect(resolveActorDisplay({ fullName: undefined, email: undefined })).toBe('Someone');
  });

  it('treats empty-string email as missing', () => {
    expect(resolveActorDisplay({ fullName: null, email: '' })).toBe('Someone');
  });
});
