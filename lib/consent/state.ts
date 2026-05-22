'use client';

// Versioned consent state. Bump the version when the cookie/analytics
// disclosure materially changes — the banner will re-prompt every user
// because stale-version records are treated as "not decided".
export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'bt.consent.v1';
const EVENT_NAME = 'bt:consent-changed';
const OPEN_PREFS_EVENT = 'bt:open-cookie-prefs';

export type ConsentDecision = {
  v: typeof CONSENT_VERSION;
  decidedAt: string;
  analytics: boolean;
};

function isDecision(value: unknown): value is ConsentDecision {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.v === CONSENT_VERSION && typeof v.decidedAt === 'string' && typeof v.analytics === 'boolean';
}

export function readConsent(): ConsentDecision | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDecision(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): ConsentDecision {
  const decision: ConsentDecision = {
    v: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    analytics,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decision));
    } catch {
      // localStorage may be unavailable (private mode, quota). Fall through —
      // the banner will simply ask again next page load.
    }
    window.dispatchEvent(new CustomEvent<ConsentDecision>(EVENT_NAME, { detail: decision }));
  }
  return decision;
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<ConsentDecision | null>(EVENT_NAME, { detail: null }));
}

export function subscribeConsent(listener: (decision: ConsentDecision | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ConsentDecision | null>).detail ?? null;
    listener(detail);
  };
  const storageHandler = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    listener(readConsent());
  };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function openCookiePreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_PREFS_EVENT));
}

export function subscribeOpenPreferences(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(OPEN_PREFS_EVENT, listener);
  return () => window.removeEventListener(OPEN_PREFS_EVENT, listener);
}
