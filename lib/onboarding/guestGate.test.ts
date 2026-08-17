import { describe, expect, it } from 'vitest';

import { resolveTutorialGuest } from './guestGate';

describe('resolveTutorialGuest', () => {
  it('invited participant with no organising footprint is a guest', () => {
    expect(
      resolveTutorialGuest({
        participatesInAnySession: true,
        facilitatesAnySession: false,
        hasElevatedOrgRole: false,
      }),
    ).toBe(true);
  });

  it('a brand-new account (no participation at all) is NOT a guest', () => {
    expect(
      resolveTutorialGuest({
        participatesInAnySession: false,
        facilitatesAnySession: false,
        hasElevatedOrgRole: false,
      }),
    ).toBe(false);
  });

  it('a participant who also facilitates a session is NOT a guest', () => {
    expect(
      resolveTutorialGuest({
        participatesInAnySession: true,
        facilitatesAnySession: true,
        hasElevatedOrgRole: false,
      }),
    ).toBe(false);
  });

  it('a participant with an elevated org role is NOT a guest', () => {
    expect(
      resolveTutorialGuest({
        participatesInAnySession: true,
        facilitatesAnySession: false,
        hasElevatedOrgRole: true,
      }),
    ).toBe(false);
  });
});
