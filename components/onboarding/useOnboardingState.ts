'use client';

import { useCallback, useEffect, useState } from 'react';

export type OnboardingRole = 'facilitator' | 'participant';

const KEYS = {
  role: 'bt_onboarding_role',
  welcomeSeen: 'bt_welcome_seen',
  checklistComplete: 'bt_checklist_complete',
  checklistDismissed: 'bt_checklist_dismissed',
  sessionTourSeen: 'bt_session_tour_seen',
  // Set by replayAll(). While present, the FacilitatorChecklist re-shows its
  // three steps (driven by real progress) even for a user who has already
  // completed the funnel — so "Replay walkthrough" shows the steps instead of
  // bouncing straight to the "complete" card.
  walkthroughReplay: 'bt_walkthrough_replay',
  // JSON array of the checklist steps ('org' | 'session' | 'model') that have
  // already had their per-step confetti. Owned by FacilitatorChecklist, but
  // registered here so it participates in cross-tab sync and is cleared by
  // replayAll() (which re-arms every step for a replayed walkthrough).
  checklistCelebrated: 'bt_checklist_celebrated',
  // JSON snapshot of the user's entity counts captured at replay start, so a
  // replayed checklist shows empty and only ticks a step once a NEW workshop /
  // session / model is created beyond that baseline. Owned by
  // FacilitatorChecklist; cleared by replayAll() (re-capture) and on dismiss.
  checklistBaseline: 'bt_checklist_baseline',
  // First-visit canvas-builder spotlight tutorial. Set when the user finishes
  // or skips the tutorial; cleared by replayAll() so "Replay walkthrough"
  // re-triggers it. Gated on this flag ALONE (not role) so participants see it.
  canvasTutorialSeen: 'bt_canvas_tutorial_seen',
  // Welcome-modal pathway completion. The modal keeps reappearing on the hub
  // pages (My Designs / Workshops / Scenarios) until the user skips it or all
  // three pathways are done. Each flag is set at that pathway's genuine
  // completion moment: build = finishing (not skipping) the canvas tutorial,
  // workshop = clicking Create workshop through the form spotlight, session =
  // clicking Create session through its spotlight. Cleared by replayAll().
  pathBuildDone: 'bt_path_build_done',
  pathWorkshopDone: 'bt_path_workshop_done',
  pathSessionDone: 'bt_path_session_done',
} as const;

export type OnboardingPath = 'build' | 'workshop' | 'session';

const PATH_KEYS: Record<OnboardingPath, string> = {
  build: KEYS.pathBuildDone,
  workshop: KEYS.pathWorkshopDone,
  session: KEYS.pathSessionDone,
};

/** localStorage key holding the JSON array of confetti-celebrated checklist
 *  steps. Read/written by FacilitatorChecklist; cleared by replayAll(). */
export const CHECKLIST_CELEBRATED_KEY = KEYS.checklistCelebrated;

/** localStorage key holding the replay-start entity-count baseline. Read/written
 *  by FacilitatorChecklist; cleared by replayAll() and dismissChecklist(). */
export const CHECKLIST_BASELINE_KEY = KEYS.checklistBaseline;

const STORAGE_KEYS = Object.values(KEYS);

// The `storage` event only fires in OTHER tabs. Setters dispatch this custom
// event so every useOnboardingState instance in the SAME tab (e.g. the
// globally mounted welcome modal + the tour that just ticked a pathway) stays
// in sync too.
const SYNC_EVENT = 'bt-onboarding-sync';

function broadcastSync(): void {
  window.dispatchEvent(new Event(SYNC_EVENT));
}

/** Fired by tours at a confetti-worthy pathway completion. The welcome modal
 *  listens and — after the confetti has had its moment — re-shows itself
 *  wherever the user is, as long as pathways remain outstanding. */
export const WELCOME_REPRISE_EVENT = 'bt-welcome-reprise';

export function requestWelcomeReprise(): void {
  window.dispatchEvent(new Event(WELCOME_REPRISE_EVENT));
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
  /** True once the user has seen the complete card at least once. */
  checklistComplete: boolean;
  checklistDismissed: boolean;
  sessionTourSeen: boolean;
  /** True once the canvas-builder tutorial has been finished or skipped. */
  canvasTutorialSeen: boolean;
  /** Welcome-modal pathway completion (build / workshop / session). */
  pathBuildDone: boolean;
  pathWorkshopDone: boolean;
  pathSessionDone: boolean;
  /** True after replayAll() until the checklist is dismissed — forces the
   *  checklist to re-show its steps regardless of server-derived progress. */
  walkthroughReplay: boolean;
  hydrated: boolean;
  markWelcomeSeen: () => void;
  markChecklistComplete: () => void;
  dismissChecklist: () => void;
  markSessionTourSeen: () => void;
  markCanvasTutorialSeen: () => void;
  markPathDone: (path: OnboardingPath) => void;
  replayAll: () => void;
}

// Returns SSR-safe defaults on the server and during the first client render,
// then hydrates from localStorage in an effect. Components must gate UI on
// `hydrated` to avoid flashing the modal before we know whether it was already
// dismissed.
export function useOnboardingState(): OnboardingState {
  const [role, setRole] = useState<OnboardingRole>('facilitator');
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [sessionTourSeen, setSessionTourSeen] = useState(false);
  const [canvasTutorialSeen, setCanvasTutorialSeen] = useState(false);
  const [pathBuildDone, setPathBuildDone] = useState(false);
  const [pathWorkshopDone, setPathWorkshopDone] = useState(false);
  const [pathSessionDone, setPathSessionDone] = useState(false);
  const [walkthroughReplay, setWalkthroughReplay] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setRole(readRole());
      setWelcomeSeen(readFlag(KEYS.welcomeSeen));
      setChecklistComplete(readFlag(KEYS.checklistComplete));
      setChecklistDismissed(readFlag(KEYS.checklistDismissed));
      setSessionTourSeen(readFlag(KEYS.sessionTourSeen));
      setCanvasTutorialSeen(readFlag(KEYS.canvasTutorialSeen));
      setPathBuildDone(readFlag(KEYS.pathBuildDone));
      setPathWorkshopDone(readFlag(KEYS.pathWorkshopDone));
      setPathSessionDone(readFlag(KEYS.pathSessionDone));
      setWalkthroughReplay(readFlag(KEYS.walkthroughReplay));
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
    broadcastSync();
  }, []);

  const markChecklistComplete = useCallback(() => {
    window.localStorage.setItem(KEYS.checklistComplete, '1');
    setChecklistComplete(true);
    broadcastSync();
  }, []);

  const dismissChecklist = useCallback(() => {
    window.localStorage.setItem(KEYS.checklistDismissed, '1');
    // Dismissing also ends any replay/preview — drop the replay flag and the
    // captured baseline so the checklist reverts to its normal behaviour.
    window.localStorage.removeItem(KEYS.walkthroughReplay);
    window.localStorage.removeItem(KEYS.checklistBaseline);
    setChecklistDismissed(true);
    setWalkthroughReplay(false);
    broadcastSync();
  }, []);

  const markSessionTourSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.sessionTourSeen, '1');
    setSessionTourSeen(true);
    broadcastSync();
  }, []);

  const markCanvasTutorialSeen = useCallback(() => {
    window.localStorage.setItem(KEYS.canvasTutorialSeen, '1');
    setCanvasTutorialSeen(true);
    broadcastSync();
  }, []);

  const markPathDone = useCallback((path: OnboardingPath) => {
    window.localStorage.setItem(PATH_KEYS[path], '1');
    if (path === 'build') setPathBuildDone(true);
    else if (path === 'workshop') setPathWorkshopDone(true);
    else setPathSessionDone(true);
    broadcastSync();
  }, []);

  const replayAll = useCallback(() => {
    window.localStorage.removeItem(KEYS.welcomeSeen);
    window.localStorage.removeItem(KEYS.checklistComplete);
    window.localStorage.removeItem(KEYS.checklistDismissed);
    window.localStorage.removeItem(KEYS.sessionTourSeen);
    window.localStorage.removeItem(KEYS.canvasTutorialSeen);
    window.localStorage.removeItem(KEYS.pathBuildDone);
    window.localStorage.removeItem(KEYS.pathWorkshopDone);
    window.localStorage.removeItem(KEYS.pathSessionDone);
    // Enter replay/preview so the checklist re-shows its steps even when the
    // user's real progress is all-done, and re-arm per-step confetti. Clearing
    // the baseline makes the checklist re-capture the current counts on its next
    // render, so the steps start empty and only tick on genuinely new entities.
    window.localStorage.setItem(KEYS.walkthroughReplay, '1');
    window.localStorage.removeItem(KEYS.checklistCelebrated);
    window.localStorage.removeItem(KEYS.checklistBaseline);
    setWelcomeSeen(false);
    setChecklistComplete(false);
    setChecklistDismissed(false);
    setSessionTourSeen(false);
    setCanvasTutorialSeen(false);
    setPathBuildDone(false);
    setPathWorkshopDone(false);
    setPathSessionDone(false);
    setWalkthroughReplay(true);
    broadcastSync();
  }, []);

  return {
    role,
    welcomeSeen,
    checklistComplete,
    checklistDismissed,
    sessionTourSeen,
    canvasTutorialSeen,
    pathBuildDone,
    pathWorkshopDone,
    pathSessionDone,
    walkthroughReplay,
    hydrated,
    markWelcomeSeen,
    markChecklistComplete,
    dismissChecklist,
    markSessionTourSeen,
    markCanvasTutorialSeen,
    markPathDone,
    replayAll,
  };
}
