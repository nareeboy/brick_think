'use client';

import { useCallback, useEffect, useState } from 'react';

export type OnboardingRole = 'facilitator' | 'participant';

const KEYS = {
  role: 'bt_onboarding_role',
  welcomeSeen: 'bt_welcome_seen',
  checklistDismissed: 'bt_checklist_dismissed',
  sessionTourSeen: 'bt_session_tour_seen',
} as const;

const STORAGE_KEYS = Object.values(KEYS);

function readRole(): OnboardingRole {
  if (typeof window === 'undefined') return 'facilitator';
  const v = window.localStorage.getItem(KEYS.role);
  return v === 'participant' ? 'participant' : 'facilitator';
}

function readFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(key) === '1';
}

export interface OnboardingState {
  role: OnboardingRole;
  welcomeSeen: boolean;
  checklistDismissed: boolean;
  sessionTourSeen: boolean;
  hydrated: boolean;
  markWelcomeSeen: () => void;
  dismissChecklist: () => void;
  markSessionTourSeen: () => void;
  replayAll: () => void;
}

// Returns SSR-safe defaults on the server and during the first client render,
// then hydrates from localStorage in an effect. Components must gate UI on
// `hydrated` to avoid flashing the modal before we know whether it was already
// dismissed.
export function useOnboardingState(): OnboardingState {
  const [role, setRole] = useState<OnboardingRole>('facilitator');
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [sessionTourSeen, setSessionTourSeen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setRole(readRole());
      setWelcomeSeen(readFlag(KEYS.welcomeSeen));
      setChecklistDismissed(readFlag(KEYS.checklistDismissed));
      setSessionTourSeen(readFlag(KEYS.sessionTourSeen));
    };
    sync();
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || STORAGE_KEYS.includes(e.key as (typeof STORAGE_KEYS)[number])) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markWelcomeSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.welcomeSeen, '1');
    setWelcomeSeen(true);
  }, []);

  const dismissChecklist = useCallback(() => {
    window.localStorage.setItem(KEYS.checklistDismissed, '1');
    setChecklistDismissed(true);
  }, []);

  const markSessionTourSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.sessionTourSeen, '1');
    setSessionTourSeen(true);
  }, []);

  const replayAll = useCallback(() => {
    window.localStorage.removeItem(KEYS.welcomeSeen);
    window.localStorage.removeItem(KEYS.checklistDismissed);
    window.localStorage.removeItem(KEYS.sessionTourSeen);
    setWelcomeSeen(false);
    setChecklistDismissed(false);
    setSessionTourSeen(false);
  }, []);

  return {
    role,
    welcomeSeen,
    checklistDismissed,
    sessionTourSeen,
    hydrated,
    markWelcomeSeen,
    dismissChecklist,
    markSessionTourSeen,
    replayAll,
  };
}
