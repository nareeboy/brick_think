import { describe, it, expect } from 'vitest';

import { computeFacilitatorChecklistProgress } from './facilitatorProgress';

// A chainable, awaitable query-builder stub: every query method returns the
// same object, and awaiting it at any point resolves to `result`. This handles
// both `.eq()`-terminal chains (org_memberships) and `.limit()`-terminal chains
// (sessions / models) without modelling each method's exact arity.
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'not', 'is', 'limit']) {
    b[m] = () => b;
  }
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}

function fakeClient(resultsByTable: Record<string, unknown>) {
  const tablesQueried: string[] = [];
  const client = {
    from: (table: string) => {
      tablesQueried.push(table);
      return builder(resultsByTable[table] ?? { data: [], error: null });
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, tablesQueried };
}

describe('computeFacilitatorChecklistProgress', () => {
  it('uses provided orgIds and skips the membership query', async () => {
    const { client, tablesQueried } = fakeClient({
      sessions: { data: [{ id: 's1' }], count: 3, error: null },
      models: { data: null, count: 2, error: null },
    });

    const progress = await computeFacilitatorChecklistProgress(client, 'u1', {
      orgIds: ['o1'],
      firstOrgId: 'o1',
    });

    expect(progress).toEqual({
      hasOrg: true,
      hasSessionInAnyOrg: true,
      hasOwnedSessionDesign: true,
      firstOrgId: 'o1',
      firstSessionId: 's1',
      orgCount: 1,
      sessionCount: 3,
      ownedSessionDesignCount: 2,
    });
    expect(tablesQueried).not.toContain('org_memberships');
  });

  it('reports all milestones false and skips the session query when the user has no orgs', async () => {
    const { client, tablesQueried } = fakeClient({
      models: { data: null, count: 0, error: null },
    });

    const progress = await computeFacilitatorChecklistProgress(client, 'u1', {
      orgIds: [],
      firstOrgId: null,
    });

    expect(progress).toEqual({
      hasOrg: false,
      hasSessionInAnyOrg: false,
      hasOwnedSessionDesign: false,
      firstOrgId: null,
      firstSessionId: null,
      orgCount: 0,
      sessionCount: 0,
      ownedSessionDesignCount: 0,
    });
    expect(tablesQueried).not.toContain('sessions');
  });

  it('self-fetches memberships and name-sorts to resolve firstOrgId when no orgIds are passed', async () => {
    const { client, tablesQueried } = fakeClient({
      org_memberships: {
        data: [
          { organisations: { id: 'beta', name: 'Beta' } },
          { organisations: { id: 'alpha', name: 'Alpha' } },
        ],
        error: null,
      },
      sessions: { data: [], error: null },
      models: { data: null, count: 0, error: null },
    });

    const progress = await computeFacilitatorChecklistProgress(client, 'u1');

    expect(tablesQueried).toContain('org_memberships');
    expect(progress.hasOrg).toBe(true);
    // Alpha sorts before Beta, so it wins firstOrgId despite arriving second.
    expect(progress.firstOrgId).toBe('alpha');
  });
});
