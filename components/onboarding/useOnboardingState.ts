'use client';

import { useCallback, useEffect, useState } from 'react';

import type { OnboardingServerState } from '@/lib/onboarding/config';

export type OnboardingRole = 'facilitator' | 'participant';

const KEYS = {
  role: 'bt_onboarding_role',
  welcomeSeen: 'bt_welcome_seen',
  sessionTourSeen: 'bt_session_tour_seen',
  // First-visit canvas-builder spotlight tutorial. Set when the user finishes
  // or skips the tutorial; cleared by replayAll() so "Replay walkthrough"
  // re-triggers it. Gated on this flag ALONE (not role) so participants see it.
  canvasTutorialSeen: 'bt_canvas_tutorial_seen',
  // First-visit workshop page tour (5 stops). Set when the tour exits any
  // way (complete / skip / quiet), so it fires once per device like the
  // session tour; ?onboarding=workshop-tour still forces a replay. Cleared
  // by replayAll().
  workshopTourSeen: 'bt_workshop_tour_seen',
  // Welcome-modal pathway state: '1' = genuinely completed, 'skipped' = the
  // user skipped that tour (stops the prompting, never renders as a tick,
  // never counts toward the finale), absent = not started. Completion is the
  // pathway's genuine moment: build = finishing the canvas tutorial, workshop
  // = completing the workshop page tour, session = clicking Create session
  // through its spotlight. Local mirror of profiles.onboarding pathways
  // (server wins via OnboardingHydrator). Cleared by replayAll().
  pathBuildDone: 'bt_path_build_done',
  pathWorkshopDone: 'bt_path_workshop_done',
  pathSessionDone: 'bt_path_session_done',
  // Explicit first-run role choice ('facilitator' | 'guest' | 'explorer')
  // from the configuration flow (or the header role switcher). Decides which
  // tutorial experience this browser gets; cleared by replayAll() so account
  // settings can re-ask. Local cache of profiles.onboarding config.role —
  // the server value wins on conflict (OnboardingHydrator).
  roleChoice: 'bt_role_choice',
  // LSP fluency from the configuration flow — drives spotlight-tour density.
  // Local cache of profiles.onboarding config.fluency; server wins.
  fluency: 'bt_fluency',
  // Group-size bracket from the configuration flow — seeds the suggested
  // room count when partitioning the shared model stage. Local cache of
  // profiles.onboarding config.group_size; server wins.
  groupSize: 'bt_group_size',
  // Sticky tutorial-guest marker. Set (client-side) the moment this browser
  // provably participates in someone else's session, so the tutorial modal
  // stays hidden even if that session — the only server-side evidence — is
  // later deleted. Cleared by replayAll() (an explicit "show me the tutorial"
  // from account settings outranks the guest inference).
  tutorialGuest: 'bt_tutorial_guest',
} as const;

export type OnboardingPath = 'build' | 'workshop' | 'session';

/** Local pathway progress. `completed` is terminal — a later skip never downgrades it. */
export type PathwayLocalState = 'not_started' | 'completed' | 'skipped';

function readPathway(key: string): PathwayLocalState {
  if (typeof window === 'undefined') return 'not_started';
  const v = window.localStorage.getItem(key);
  return v === '1' ? 'completed' : v === 'skipped' ? 'skipped' : 'not_started';
}

export type RoleChoice = 'facilitator' | 'guest' | 'explorer';

function readRoleChoice(): RoleChoice | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEYS.roleChoice);
  return v === 'facilitator' || v === 'guest' || v === 'explorer' ? v : null;
}

export type FluencyChoice = 'certified' | 'run_before' | 'read_about' | 'new';

export type GroupSizeChoice = 'solo' | '2_4' | '5_8' | '9_plus';

/** Reads the cached group-size bracket (safe anywhere client-side). */
export function readGroupSizeChoice(): GroupSizeChoice | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEYS.groupSize);
  return v === 'solo' || v === '2_4' || v === '5_8' || v === '9_plus' ? v : null;
}

/** Caches the group-size answer locally (the flow also persists it server-side). */
export function cacheGroupSizeChoice(choice: GroupSizeChoice): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEYS.groupSize, choice);
}

function readFluency(): FluencyChoice | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEYS.fluency);
  return v === 'certified' || v === 'run_before' || v === 'read_about' || v === 'new' ? v : null;
}

const PATH_KEYS: Record<OnboardingPath, string> = {
  build: KEYS.pathBuildDone,
  workshop: KEYS.pathWorkshopDone,
  session: KEYS.pathSessionDone,
};

const STORAGE_KEYS = Object.values(KEYS);

// The `storage` event only fires in OTHER tabs. Setters dispatch this custom
// event so every useOnboardingState instance in the SAME tab (e.g. the
// globally mounted welcome modal + the tour that just ticked a pathway) stays
// in sync too.
const SYNC_EVENT = 'bt-onboarding-sync';

function broadcastSync(): void {
  window.dispatchEvent(new Event(SYNC_EVENT));
}

/**
 * Writes the server's `profiles.onboarding` truths into the local `bt_` caches
 * (server wins on conflict). Deliberately only SETS values the server actually
 * holds — server defaults (null role, not_started pathways) never clear local
 * flags, so pre-migration users keep their local progress untouched. Called by
 * OnboardingHydrator on every authed layout mount.
 */
export function hydrateOnboardingFromServer(server: OnboardingServerState): void {
  if (typeof window === 'undefined') return;
  let changed = false;
  const setIfDiffers = (key: string, value: string) => {
    if (window.localStorage.getItem(key) !== value) {
      window.localStorage.setItem(key, value);
      changed = true;
    }
  };

  const role = server.config.role;
  if (role !== null) {
    const choice: RoleChoice =
      role === 'participant' ? 'guest' : role === 'explorer' ? 'explorer' : 'facilitator';
    setIfDiffers(KEYS.roleChoice, choice);
    if (choice === 'guest') setIfDiffers(KEYS.tutorialGuest, '1');
  }
  if (server.config.fluency !== null) setIfDiffers(KEYS.fluency, server.config.fluency);
  if (server.config.groupSize !== null) setIfDiffers(KEYS.groupSize, server.config.groupSize);
  for (const [path, key] of Object.entries(PATH_KEYS) as [OnboardingPath, string][]) {
    const state = server.pathways[path];
    if (state !== 'not_started') setIfDiffers(key, state === 'completed' ? '1' : 'skipped');
  }
  if (server.welcomeDismissedAt !== null) setIfDiffers(KEYS.welcomeSeen, '1');

  if (changed) broadcastSync();
}

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
  sessionTourSeen: boolean;
  /** True once the workshop page tour has run (any exit) on this device. */
  workshopTourSeen: boolean;
  /** True once the canvas-builder tutorial has been finished or skipped. */
  canvasTutorialSeen: boolean;
  /** Welcome-modal pathway progress (build / workshop / session). */
  pathways: Record<OnboardingPath, PathwayLocalState>;
  hydrated: boolean;
  markWelcomeSeen: () => void;
  markSessionTourSeen: () => void;
  markWorkshopTourSeen: () => void;
  markCanvasTutorialSeen: () => void;
  /** Record a pathway outcome locally + server-side. Completed is terminal. */
  markPathway: (path: OnboardingPath, outcome: 'completed' | 'skipped') => void;
  /** True when this browser has been marked as an invited session guest. */
  tutorialGuestSticky: boolean;
  markTutorialGuest: () => void;
  /** The explicit first-run role choice, or null while unanswered. */
  roleChoice: RoleChoice | null;
  chooseRole: (choice: RoleChoice) => void;
  /** LSP fluency from the configuration flow, or null while unanswered. */
  fluency: FluencyChoice | null;
  /** Cache the fluency answer locally (the flow also persists it server-side). */
  chooseFluency: (choice: FluencyChoice) => void;
  replayAll: () => void;
}

// Returns SSR-safe defaults on the server and during the first client render,
// then hydrates from localStorage in an effect. Components must gate UI on
// `hydrated` to avoid flashing the modal before we know whether it was already
// dismissed.
export function useOnboardingState(): OnboardingState {
  const [role, setRole] = useState<OnboardingRole>('facilitator');
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [sessionTourSeen, setSessionTourSeen] = useState(false);
  const [workshopTourSeen, setWorkshopTourSeen] = useState(false);
  const [canvasTutorialSeen, setCanvasTutorialSeen] = useState(false);
  const [pathways, setPathways] = useState<Record<OnboardingPath, PathwayLocalState>>({
    build: 'not_started',
    workshop: 'not_started',
    session: 'not_started',
  });
  const [tutorialGuestSticky, setTutorialGuestSticky] = useState(false);
  const [roleChoice, setRoleChoice] = useState<RoleChoice | null>(null);
  const [fluency, setFluency] = useState<FluencyChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setRole(readRole());
      setWelcomeSeen(readFlag(KEYS.welcomeSeen));
      setSessionTourSeen(readFlag(KEYS.sessionTourSeen));
      setWorkshopTourSeen(readFlag(KEYS.workshopTourSeen));
      setCanvasTutorialSeen(readFlag(KEYS.canvasTutorialSeen));
      setPathways({
        build: readPathway(KEYS.pathBuildDone),
        workshop: readPathway(KEYS.pathWorkshopDone),
        session: readPathway(KEYS.pathSessionDone),
      });
      setTutorialGuestSticky(readFlag(KEYS.tutorialGuest));
      setRoleChoice(readRoleChoice());
      setFluency(readFluency());
    };
    sync();
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (STORAGE_KEYS as readonly string[]).includes(e.key)) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, sync);
    };
  }, []);

  const markWelcomeSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.welcomeSeen, '1');
    setWelcomeSeen(true);
    // Record the dismissal server-side (drop-off telemetry + cross-device).
    // Fire-and-forget: local state is already correct if this fails.
    void import('@/lib/onboarding/actions').then((m) => m.dismissWelcome()).catch(() => {});
    broadcastSync();
  }, []);

  const markSessionTourSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.sessionTourSeen, '1');
    setSessionTourSeen(true);
    broadcastSync();
  }, []);

  const markWorkshopTourSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.workshopTourSeen, '1');
    setWorkshopTourSeen(true);
    broadcastSync();
  }, []);

  const markCanvasTutorialSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.canvasTutorialSeen, '1');
    setCanvasTutorialSeen(true);
    broadcastSync();
  }, []);

  const markPathway = useCallback((path: OnboardingPath, outcome: 'completed' | 'skipped') => {
    // Completed is terminal — a later skip never downgrades it (mirrors the
    // server rule in applyPathwayOutcome).
    if (readPathway(PATH_KEYS[path]) === 'completed') return;
    window.localStorage.setItem(PATH_KEYS[path], outcome === 'completed' ? '1' : 'skipped');
    setPathways((prev) => ({ ...prev, [path]: outcome }));
    // Persist + record the drop-off event server-side, fire-and-forget.
    void import('@/lib/onboarding/actions')
      .then((m) => m.setPathwayOutcome(path, outcome))
      .catch(() => {});
    broadcastSync();
  }, []);

  const markTutorialGuest = useCallback(() => {
    window.localStorage.setItem(KEYS.tutorialGuest, '1');
    setTutorialGuestSticky(true);
    broadcastSync();
  }, []);

  const chooseRole = useCallback((choice: RoleChoice) => {
    window.localStorage.setItem(KEYS.roleChoice, choice);
    setRoleChoice(choice);
    // The choice owns the sticky guest flag in both directions: declaring
    // Guest suppresses the tutorial modal; declaring Facilitator or Explorer
    // (e.g. via the header role switcher) un-suppresses it.
    if (choice === 'guest') {
      window.localStorage.setItem(KEYS.tutorialGuest, '1');
      setTutorialGuestSticky(true);
    } else {
      window.localStorage.removeItem(KEYS.tutorialGuest);
      setTutorialGuestSticky(false);
    }
    broadcastSync();
  }, []);

  const chooseFluency = useCallback((choice: FluencyChoice) => {
    window.localStorage.setItem(KEYS.fluency, choice);
    setFluency(choice);
    broadcastSync();
  }, []);

  const replayAll = useCallback(() => {
    window.localStorage.removeItem(KEYS.tutorialGuest);
    window.localStorage.removeItem(KEYS.roleChoice);
    window.localStorage.removeItem(KEYS.fluency);
    window.localStorage.removeItem(KEYS.groupSize);
    setTutorialGuestSticky(false);
    setRoleChoice(null);
    setFluency(null);
    window.localStorage.removeItem(KEYS.welcomeSeen);
    window.localStorage.removeItem(KEYS.sessionTourSeen);
    window.localStorage.removeItem(KEYS.workshopTourSeen);
    window.localStorage.removeItem(KEYS.canvasTutorialSeen);
    window.localStorage.removeItem(KEYS.pathBuildDone);
    window.localStorage.removeItem(KEYS.pathWorkshopDone);
    window.localStorage.removeItem(KEYS.pathSessionDone);
    // One-time hygiene for browsers that still carry checklist-era keys
    // (the FacilitatorChecklist and its replay/baseline state are long gone).
    window.localStorage.removeItem('bt_checklist_complete');
    window.localStorage.removeItem('bt_checklist_dismissed');
    window.localStorage.removeItem('bt_checklist_celebrated');
    window.localStorage.removeItem('bt_checklist_baseline');
    window.localStorage.removeItem('bt_walkthrough_replay');
    setWelcomeSeen(false);
    setSessionTourSeen(false);
    setWorkshopTourSeen(false);
    setCanvasTutorialSeen(false);
    setPathways({ build: 'not_started', workshop: 'not_started', session: 'not_started' });
    broadcastSync();
  }, []);

  return {
    role,
    welcomeSeen,
    sessionTourSeen,
    workshopTourSeen,
    canvasTutorialSeen,
    pathways,
    hydrated,
    markWelcomeSeen,
    markSessionTourSeen,
    markWorkshopTourSeen,
    markCanvasTutorialSeen,
    markPathway,
    tutorialGuestSticky,
    markTutorialGuest,
    roleChoice,
    chooseRole,
    fluency,
    chooseFluency,
    replayAll,
  };
}
