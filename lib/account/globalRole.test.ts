import { describe, expect, it } from 'vitest';

import { resolveGlobalRole } from './globalRole';

describe('resolveGlobalRole', () => {
  it('is facilitator when the user facilitates a session', () => {
    expect(resolveGlobalRole({ facilitatesAnySession: true, hasElevatedOrgRole: false })).toBe(
      'facilitator',
    );
  });

  it('is facilitator on an elevated org role alone (owner/admin/facilitator)', () => {
    expect(resolveGlobalRole({ facilitatesAnySession: false, hasElevatedOrgRole: true })).toBe(
      'facilitator',
    );
  });

  it('is guest for invited participants and brand-new accounts', () => {
    expect(resolveGlobalRole({ facilitatesAnySession: false, hasElevatedOrgRole: false })).toBe(
      'guest',
    );
  });
});
