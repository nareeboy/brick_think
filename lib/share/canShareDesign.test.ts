import { describe, expect, it } from 'vitest';

import { canShareDesign } from './canShareDesign';

describe('canShareDesign', () => {
  it('shows on a personal design (no org, no session)', () => {
    expect(canShareDesign({ hasModel: true, orgId: null, inSession: false })).toBe(true);
  });

  it('hides on a session design — createShareLink rejects session-scoped models', () => {
    // The reported bug: clicking share on a session canvas threw
    // "Session designs are not shareable." because the button was shown
    // despite the server gate.
    expect(canShareDesign({ hasModel: true, orgId: null, inSession: true })).toBe(false);
  });

  it('hides on an org-shared design', () => {
    expect(canShareDesign({ hasModel: true, orgId: 'org-1', inSession: false })).toBe(false);
  });

  it('hides when no model is loaded', () => {
    expect(canShareDesign({ hasModel: false, orgId: null, inSession: false })).toBe(false);
  });
});
