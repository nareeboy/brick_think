import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// markPathway / markWelcomeSeen persist server-side via a fire-and-forget
// dynamic import; resolve it to mocks so nothing lands after jsdom teardown.
vi.mock('@/lib/onboarding/actions', () => ({
  setPathwayOutcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
  dismissWelcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
  saveOnboardingConfig: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

import { useOnboardingState, hydrateOnboardingFromServer } from './useOnboardingState';
import { EMPTY_ONBOARDING } from '@/lib/onboarding/config';

afterEach(() => {
  // Unmount every hook before the next test: hydrateOnboardingFromServer
  // broadcasts a sync event, and a still-mounted hook from an earlier test
  // would schedule a React render that lands after environment teardown.
  cleanup();
  localStorage.clear();
});

describe('useOnboardingState', () => {
  it('returns facilitator role by default when key is unset', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.role).toBe('facilitator');
  });

  it('reads participant role from localStorage', () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.role).toBe('participant');
  });

  it('welcomeSeen, sessionTourSeen and workshopTourSeen default to false', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.sessionTourSeen).toBe(false);
    expect(result.current.workshopTourSeen).toBe(false);
  });

  it('markWelcomeSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markWelcomeSeen());
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    expect(result.current.welcomeSeen).toBe(true);
  });

  it('markSessionTourSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markSessionTourSeen());
    expect(localStorage.getItem('bt_session_tour_seen')).toBe('1');
    expect(result.current.sessionTourSeen).toBe(true);
  });

  it('markWorkshopTourSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markWorkshopTourSeen());
    expect(localStorage.getItem('bt_workshop_tour_seen')).toBe('1');
    expect(result.current.workshopTourSeen).toBe(true);
  });

  it('pathways default to not_started and read completed/skipped values', () => {
    localStorage.setItem('bt_path_build_done', '1');
    localStorage.setItem('bt_path_workshop_done', 'skipped');
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.pathways).toEqual({
      build: 'completed',
      workshop: 'skipped',
      session: 'not_started',
    });
  });

  it('markPathway records completed and skipped, and completed is terminal', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markPathway('workshop', 'skipped'));
    expect(localStorage.getItem('bt_path_workshop_done')).toBe('skipped');
    expect(result.current.pathways.workshop).toBe('skipped');
    // A skip can upgrade to completed…
    act(() => result.current.markPathway('workshop', 'completed'));
    expect(localStorage.getItem('bt_path_workshop_done')).toBe('1');
    // …but completed never downgrades to skipped.
    act(() => result.current.markPathway('workshop', 'skipped'));
    expect(localStorage.getItem('bt_path_workshop_done')).toBe('1');
    expect(result.current.pathways.workshop).toBe('completed');
  });

  it('reads the fluency cache', () => {
    localStorage.setItem('bt_fluency', 'certified');
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.fluency).toBe('certified');
  });

  it('syncs state when another tab writes a flag via StorageEvent', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.welcomeSeen).toBe(false);
    act(() => {
      localStorage.setItem('bt_welcome_seen', '1');
      window.dispatchEvent(new StorageEvent('storage', { key: 'bt_welcome_seen', newValue: '1' }));
    });
    expect(result.current.welcomeSeen).toBe(true);
  });

  it('syncs state when storage is cleared from another tab (key: null)', () => {
    localStorage.setItem('bt_welcome_seen', '1');
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.welcomeSeen).toBe(true);
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(result.current.welcomeSeen).toBe(false);
  });

  it('replayAll clears every flag (preserves role) including checklist-era leftovers', () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    localStorage.setItem('bt_welcome_seen', '1');
    localStorage.setItem('bt_session_tour_seen', '1');
    localStorage.setItem('bt_workshop_tour_seen', '1');
    localStorage.setItem('bt_fluency', 'new');
    localStorage.setItem('bt_path_build_done', 'skipped');
    localStorage.setItem('bt_checklist_complete', '1');
    localStorage.setItem('bt_walkthrough_replay', '1');
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.replayAll());
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
    expect(localStorage.getItem('bt_session_tour_seen')).toBeNull();
    expect(localStorage.getItem('bt_workshop_tour_seen')).toBeNull();
    expect(localStorage.getItem('bt_fluency')).toBeNull();
    expect(localStorage.getItem('bt_path_build_done')).toBeNull();
    expect(localStorage.getItem('bt_checklist_complete')).toBeNull();
    expect(localStorage.getItem('bt_walkthrough_replay')).toBeNull();
    expect(localStorage.getItem('bt_onboarding_role')).toBe('participant');
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.role).toBe('participant');
  });
});

describe('hydrateOnboardingFromServer', () => {
  it('is a no-op for the empty server state (pre-migration users keep local progress)', () => {
    localStorage.setItem('bt_role_choice', 'facilitator');
    localStorage.setItem('bt_path_build_done', '1');
    hydrateOnboardingFromServer(EMPTY_ONBOARDING);
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_path_build_done')).toBe('1');
    expect(localStorage.getItem('bt_fluency')).toBeNull();
  });

  it('writes server truths into the caches — server wins on conflict', () => {
    localStorage.setItem('bt_role_choice', 'guest');
    hydrateOnboardingFromServer({
      ...EMPTY_ONBOARDING,
      config: { ...EMPTY_ONBOARDING.config, role: 'facilitator', fluency: 'run_before' },
      pathways: { build: 'completed', workshop: 'skipped', session: 'not_started' },
      welcomeDismissedAt: '2026-08-28T10:00:00.000Z',
    });
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_fluency')).toBe('run_before');
    expect(localStorage.getItem('bt_path_build_done')).toBe('1');
    expect(localStorage.getItem('bt_path_workshop_done')).toBe('skipped');
    expect(localStorage.getItem('bt_path_session_done')).toBeNull();
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
  });

  it('maps a participant role to the guest cache with the sticky flag', () => {
    hydrateOnboardingFromServer({
      ...EMPTY_ONBOARDING,
      config: { ...EMPTY_ONBOARDING.config, role: 'participant' },
    });
    expect(localStorage.getItem('bt_role_choice')).toBe('guest');
    expect(localStorage.getItem('bt_tutorial_guest')).toBe('1');
  });
});
