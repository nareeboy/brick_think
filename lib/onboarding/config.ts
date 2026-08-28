/**
 * Shape of the `profiles.onboarding` jsonb column — the server-side source of
 * truth for the configuration flow's answers and pathway progress. Stored as
 * snake_case JSON; exposed to the app as the camelCase types below. Tour
 * seen-flags deliberately stay in per-device localStorage and never appear
 * here. Follows the `a11y_preferences` normaliser pattern: any malformed value
 * degrades to defaults, never throws.
 */

export type OnboardingConfigRole = 'facilitator' | 'participant' | 'explorer';
export type OnboardingFluency = 'certified' | 'run_before' | 'read_about' | 'new';
export type OnboardingPurpose =
  | 'team_alignment'
  | 'strategy'
  | 'retrospective'
  | 'team_onboarding'
  | 'product_discovery'
  | 'not_sure';
export type OnboardingGroupSize = 'solo' | '2_4' | '5_8' | '9_plus';
export type PathwayState = 'not_started' | 'completed' | 'skipped';
export type OnboardingPathwayKey = 'build' | 'workshop' | 'session';
export type OnboardingEventKind =
  | 'pathway_start'
  | 'pathway_complete'
  | 'pathway_skip'
  | 'modal_dismiss';

export interface OnboardingEvent {
  /** ISO timestamp. */
  t: string;
  k: OnboardingEventKind;
  /** Pathway key, for pathway events. */
  p?: OnboardingPathwayKey;
}

export interface OnboardingConfig {
  /** ISO timestamp stamped when the configuration flow finishes; null while unanswered. */
  completedAt: string | null;
  role: OnboardingConfigRole | null;
  fluency: OnboardingFluency | null;
  purpose: OnboardingPurpose | null;
  groupSize: OnboardingGroupSize | null;
  /** Step-5 emails queued until the first session exists (invites need a join code). */
  pendingInvites: string[];
  /** True once the purpose's scenarios + brief pre-fill have been applied to a first session. */
  purposeApplied: boolean;
  /** True once pendingInvites have been sent (they are also cleared then). */
  invitesDispatched: boolean;
}

export interface OnboardingServerState {
  v: 1;
  config: OnboardingConfig;
  pathways: Record<OnboardingPathwayKey, PathwayState>;
  /** ISO timestamp of the pathway modal's dismissal; null while never dismissed. */
  welcomeDismissedAt: string | null;
  events: OnboardingEvent[];
}

export const MAX_PENDING_INVITES = 25;
export const MAX_ONBOARDING_EVENTS = 50;

export const EMPTY_ONBOARDING: OnboardingServerState = {
  v: 1,
  config: {
    completedAt: null,
    role: null,
    fluency: null,
    purpose: null,
    groupSize: null,
    pendingInvites: [],
    purposeApplied: false,
    invitesDispatched: false,
  },
  pathways: { build: 'not_started', workshop: 'not_started', session: 'not_started' },
  welcomeDismissedAt: null,
  events: [],
};

const ROLES: readonly OnboardingConfigRole[] = ['facilitator', 'participant', 'explorer'];
const FLUENCIES: readonly OnboardingFluency[] = ['certified', 'run_before', 'read_about', 'new'];
const PURPOSES: readonly OnboardingPurpose[] = [
  'team_alignment',
  'strategy',
  'retrospective',
  'team_onboarding',
  'product_discovery',
  'not_sure',
];
const GROUP_SIZES: readonly OnboardingGroupSize[] = ['solo', '2_4', '5_8', '9_plus'];
const PATHWAY_STATES: readonly PathwayState[] = ['not_started', 'completed', 'skipped'];
const PATHWAY_KEYS: readonly OnboardingPathwayKey[] = ['build', 'workshop', 'session'];
const EVENT_KINDS: readonly OnboardingEventKind[] = [
  'pathway_start',
  'pathway_complete',
  'pathway_skip',
  'modal_dismiss',
];

function pick<T extends string>(allowed: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Normalises a raw `profiles.onboarding` JSON value into a full state object. */
export function normaliseOnboarding(raw: unknown): OnboardingServerState {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return structuredClone(EMPTY_ONBOARDING);
  }
  const obj = raw as Record<string, unknown>;
  const rawConfig =
    obj.config !== null && typeof obj.config === 'object' && !Array.isArray(obj.config)
      ? (obj.config as Record<string, unknown>)
      : {};
  const rawPathways =
    obj.pathways !== null && typeof obj.pathways === 'object' && !Array.isArray(obj.pathways)
      ? (obj.pathways as Record<string, unknown>)
      : {};

  const pendingInvites = Array.isArray(rawConfig.pending_invites)
    ? rawConfig.pending_invites
        .filter((e): e is string => typeof e === 'string')
        .slice(0, MAX_PENDING_INVITES)
    : [];

  const events: OnboardingEvent[] = Array.isArray(obj.events)
    ? obj.events
        .flatMap((e): OnboardingEvent[] => {
          if (e === null || typeof e !== 'object') return [];
          const ev = e as Record<string, unknown>;
          const k = pick(EVENT_KINDS, ev.k);
          const t = isoOrNull(ev.t);
          if (k === null || t === null) return [];
          const p = pick(PATHWAY_KEYS, ev.p);
          return [p === null ? { t, k } : { t, k, p }];
        })
        .slice(-MAX_ONBOARDING_EVENTS)
    : [];

  const pathways = Object.fromEntries(
    PATHWAY_KEYS.map((key) => [key, pick(PATHWAY_STATES, rawPathways[key]) ?? 'not_started']),
  ) as Record<OnboardingPathwayKey, PathwayState>;

  return {
    v: 1,
    config: {
      completedAt: isoOrNull(rawConfig.completed_at),
      role: pick(ROLES, rawConfig.role),
      fluency: pick(FLUENCIES, rawConfig.fluency),
      purpose: pick(PURPOSES, rawConfig.purpose),
      groupSize: pick(GROUP_SIZES, rawConfig.group_size),
      pendingInvites,
      purposeApplied: rawConfig.purpose_applied === true,
      invitesDispatched: rawConfig.invites_dispatched === true,
    },
    pathways,
    welcomeDismissedAt: isoOrNull(obj.welcome_dismissed_at),
    events,
  };
}

/** Serialises a state object back into the snake_case JSON stored in the column. */
export function serialiseOnboarding(state: OnboardingServerState): Record<string, unknown> {
  return {
    v: 1,
    config: {
      completed_at: state.config.completedAt,
      role: state.config.role,
      fluency: state.config.fluency,
      purpose: state.config.purpose,
      group_size: state.config.groupSize,
      pending_invites: state.config.pendingInvites.slice(0, MAX_PENDING_INVITES),
      purpose_applied: state.config.purposeApplied,
      invites_dispatched: state.config.invitesDispatched,
    },
    pathways: { ...state.pathways },
    welcome_dismissed_at: state.welcomeDismissedAt,
    events: state.events.slice(-MAX_ONBOARDING_EVENTS).map((e) => ({ ...e })),
  };
}
