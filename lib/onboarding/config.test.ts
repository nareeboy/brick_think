import { describe, expect, it } from 'vitest';

import {
  applyConfigPatch,
  applyPathwayOutcome,
  applyWelcomeDismissed,
  EMPTY_ONBOARDING,
  MAX_ONBOARDING_EVENTS,
  MAX_PENDING_INVITES,
  normaliseOnboarding,
  serialiseOnboarding,
  type OnboardingServerState,
} from './config';

describe('normaliseOnboarding', () => {
  it('returns the empty state for null, non-objects, and empty objects', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}]) {
      expect(normaliseOnboarding(raw)).toEqual(EMPTY_ONBOARDING);
    }
  });

  it('round-trips a fully populated state through serialise + normalise', () => {
    const state: OnboardingServerState = {
      v: 1,
      config: {
        completedAt: '2026-08-28T10:00:00.000Z',
        role: 'facilitator',
        fluency: 'run_before',
        purpose: 'retrospective',
        groupSize: '5_8',
        pendingInvites: ['a@example.com', 'b@example.com'],
        purposeApplied: true,
        invitesDispatched: false,
      },
      pathways: { build: 'completed', workshop: 'skipped', session: 'not_started' },
      welcomeDismissedAt: '2026-08-28T11:00:00.000Z',
      events: [{ t: '2026-08-28T10:00:00.000Z', k: 'pathway_complete', p: 'build' }],
    };
    expect(normaliseOnboarding(serialiseOnboarding(state))).toEqual(state);
  });

  it('drops invalid enum values back to null / not_started', () => {
    const raw = {
      v: 1,
      config: { role: 'admin', fluency: 'expert', purpose: 'fun', group_size: '100' },
      pathways: { build: 'done', workshop: 'completed', session: 7 },
    };
    const state = normaliseOnboarding(raw);
    expect(state.config.role).toBeNull();
    expect(state.config.fluency).toBeNull();
    expect(state.config.purpose).toBeNull();
    expect(state.config.groupSize).toBeNull();
    expect(state.pathways).toEqual({
      build: 'not_started',
      workshop: 'completed',
      session: 'not_started',
    });
  });

  it('keeps only string entries in pending_invites and caps them', () => {
    const raw = {
      v: 1,
      config: {
        pending_invites: [
          'a@example.com',
          7,
          null,
          ...Array.from({ length: MAX_PENDING_INVITES + 5 }, (_, i) => `x${i}@example.com`),
        ],
      },
    };
    const invites = normaliseOnboarding(raw).config.pendingInvites;
    expect(invites[0]).toBe('a@example.com');
    expect(invites).toHaveLength(MAX_PENDING_INVITES);
    expect(invites.every((e) => typeof e === 'string')).toBe(true);
  });

  it('keeps only well-formed events and caps at the latest MAX_ONBOARDING_EVENTS', () => {
    const events = Array.from({ length: MAX_ONBOARDING_EVENTS + 10 }, (_, i) => ({
      t: `2026-08-28T10:00:${String(i % 60).padStart(2, '0')}.000Z`,
      k: 'pathway_skip',
      p: 'workshop',
      i,
    }));
    const raw = { v: 1, events: [...events, { k: 'nonsense' }, 'junk'] };
    const state = normaliseOnboarding(raw);
    expect(state.events).toHaveLength(MAX_ONBOARDING_EVENTS);
    expect(state.events.at(-1)).toEqual({
      t: events.at(-1)!.t,
      k: 'pathway_skip',
      p: 'workshop',
    });
  });

  it('preserves the bookkeeping booleans', () => {
    const raw = { v: 1, config: { purpose_applied: true, invites_dispatched: true } };
    const state = normaliseOnboarding(raw);
    expect(state.config.purposeApplied).toBe(true);
    expect(state.config.invitesDispatched).toBe(true);
  });
});

describe('applyConfigPatch', () => {
  it('merges only the given fields and leaves the rest untouched', () => {
    const base = normaliseOnboarding({ v: 1, config: { role: 'facilitator' } });
    const next = applyConfigPatch(base, { fluency: 'certified', groupSize: '2_4' });
    expect(next.config.role).toBe('facilitator');
    expect(next.config.fluency).toBe('certified');
    expect(next.config.groupSize).toBe('2_4');
    expect(base.config.fluency).toBeNull();
  });
});

describe('applyPathwayOutcome', () => {
  const NOW = '2026-08-28T12:00:00.000Z';

  it('records completion with an event', () => {
    const next = applyPathwayOutcome(EMPTY_ONBOARDING, 'workshop', 'completed', NOW);
    expect(next.pathways.workshop).toBe('completed');
    expect(next.events.at(-1)).toEqual({ t: NOW, k: 'pathway_complete', p: 'workshop' });
  });

  it('records a skip with an event', () => {
    const next = applyPathwayOutcome(EMPTY_ONBOARDING, 'build', 'skipped', NOW);
    expect(next.pathways.build).toBe('skipped');
    expect(next.events.at(-1)).toEqual({ t: NOW, k: 'pathway_skip', p: 'build' });
  });

  it('never downgrades completed to skipped, but upgrades skipped to completed', () => {
    const done = applyPathwayOutcome(EMPTY_ONBOARDING, 'session', 'completed', NOW);
    const attempted = applyPathwayOutcome(done, 'session', 'skipped', NOW);
    expect(attempted.pathways.session).toBe('completed');
    expect(attempted.events).toHaveLength(done.events.length);

    const skipped = applyPathwayOutcome(EMPTY_ONBOARDING, 'session', 'skipped', NOW);
    const upgraded = applyPathwayOutcome(skipped, 'session', 'completed', NOW);
    expect(upgraded.pathways.session).toBe('completed');
  });
});

describe('applyWelcomeDismissed', () => {
  it('stamps dismissal once with an event and is idempotent', () => {
    const NOW = '2026-08-28T12:00:00.000Z';
    const once = applyWelcomeDismissed(EMPTY_ONBOARDING, NOW);
    expect(once.welcomeDismissedAt).toBe(NOW);
    expect(once.events.at(-1)).toEqual({ t: NOW, k: 'modal_dismiss' });
    const twice = applyWelcomeDismissed(once, '2026-08-28T13:00:00.000Z');
    expect(twice.welcomeDismissedAt).toBe(NOW);
    expect(twice.events).toHaveLength(once.events.length);
  });
});
