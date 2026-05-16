import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useOnboardingState } from './useOnboardingState';

afterEach(() => {
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

  it('welcomeSeen and checklistDismissed default to false', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.checklistDismissed).toBe(false);
    expect(result.current.sessionTourSeen).toBe(false);
  });

  it('markWelcomeSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markWelcomeSeen());
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    expect(result.current.welcomeSeen).toBe(true);
  });

  it('replayAll clears every flag (preserves role)', () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    localStorage.setItem('bt_welcome_seen', '1');
    localStorage.setItem('bt_checklist_dismissed', '1');
    localStorage.setItem('bt_session_tour_seen', '1');
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.replayAll());
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
    expect(localStorage.getItem('bt_checklist_dismissed')).toBeNull();
    expect(localStorage.getItem('bt_session_tour_seen')).toBeNull();
    expect(localStorage.getItem('bt_onboarding_role')).toBe('participant');
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.role).toBe('participant');
  });
});
