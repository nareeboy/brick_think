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

  it('welcomeSeen, checklistComplete, checklistDismissed, and sessionTourSeen default to false', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.checklistComplete).toBe(false);
    expect(result.current.checklistDismissed).toBe(false);
    expect(result.current.sessionTourSeen).toBe(false);
  });

  it('markWelcomeSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markWelcomeSeen());
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    expect(result.current.welcomeSeen).toBe(true);
  });

  it('markChecklistComplete writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markChecklistComplete());
    expect(localStorage.getItem('bt_checklist_complete')).toBe('1');
    expect(result.current.checklistComplete).toBe(true);
  });

  it('dismissChecklist writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.dismissChecklist());
    expect(localStorage.getItem('bt_checklist_dismissed')).toBe('1');
    expect(result.current.checklistDismissed).toBe(true);
  });

  it('markSessionTourSeen writes the flag and updates state', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.markSessionTourSeen());
    expect(localStorage.getItem('bt_session_tour_seen')).toBe('1');
    expect(result.current.sessionTourSeen).toBe(true);
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

  it('replayAll clears every flag (preserves role)', () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    localStorage.setItem('bt_welcome_seen', '1');
    localStorage.setItem('bt_checklist_complete', '1');
    localStorage.setItem('bt_checklist_dismissed', '1');
    localStorage.setItem('bt_session_tour_seen', '1');
    const { result } = renderHook(() => useOnboardingState());
    act(() => result.current.replayAll());
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
    expect(localStorage.getItem('bt_checklist_complete')).toBeNull();
    expect(localStorage.getItem('bt_checklist_dismissed')).toBeNull();
    expect(localStorage.getItem('bt_session_tour_seen')).toBeNull();
    expect(localStorage.getItem('bt_onboarding_role')).toBe('participant');
    expect(result.current.welcomeSeen).toBe(false);
    expect(result.current.checklistComplete).toBe(false);
    expect(result.current.role).toBe('participant');
  });
});
