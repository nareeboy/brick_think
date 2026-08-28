'use server';

import type { ActionResult } from '@/lib/actions/result';
import { createServerSupabaseClient } from '@/lib/db/server';

import {
  applyConfigPatch,
  applyPathwayOutcome,
  applyWelcomeDismissed,
  MAX_PENDING_INVITES,
  normaliseOnboarding,
  serialiseOnboarding,
  type OnboardingConfig,
  type OnboardingPathwayKey,
  type OnboardingServerState,
} from './config';

export type OnboardingActionResult = ActionResult<null, 'unauthenticated'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Read-modify-write on the caller's own profiles.onboarding column. Both
// reads and writes go through the RLS-scoped client ("Profiles: update own"),
// and every merge passes through the normaliser so junk from a tampered
// client degrades to defaults instead of landing in the column. Last write
// wins — the column is only ever written by its owner.
async function mutateOnboarding(
  mutate: (state: OnboardingServerState, now: string) => OnboardingServerState,
): Promise<OnboardingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const read = await supabase.from('profiles').select('onboarding').eq('id', user.id).single();
  if (read.error) throw new Error(`Failed to load onboarding state: ${read.error.message}`);

  const now = new Date().toISOString();
  const next = normaliseOnboarding(
    serialiseOnboarding(mutate(normaliseOnboarding(read.data.onboarding), now)),
  );

  const write = await supabase
    .from('profiles')
    .update({ onboarding: serialiseOnboarding(next) })
    .eq('id', user.id);
  if (write.error) throw new Error(`Failed to save onboarding state: ${write.error.message}`);

  return { ok: true, data: null };
}

export interface OnboardingConfigPatch {
  role?: OnboardingConfig['role'];
  fluency?: OnboardingConfig['fluency'];
  purpose?: OnboardingConfig['purpose'];
  groupSize?: OnboardingConfig['groupSize'];
  pendingInvites?: string[];
  /** Stamp completed_at (the flow finished). */
  completed?: boolean;
}

/** Persist configuration-flow answers. Only the provided fields change. */
export async function saveOnboardingConfig(
  patch: OnboardingConfigPatch,
): Promise<OnboardingActionResult> {
  return mutateOnboarding((state, now) => {
    const { completed, pendingInvites, ...rest } = patch;
    let next = applyConfigPatch(state, rest);
    if (pendingInvites !== undefined) {
      const cleaned = [
        ...new Set(
          pendingInvites.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)),
        ),
      ].slice(0, MAX_PENDING_INVITES);
      next = applyConfigPatch(next, { pendingInvites: cleaned });
    }
    if (completed === true && next.config.completedAt === null) {
      next = applyConfigPatch(next, { completedAt: now });
    }
    return next;
  });
}

/** Record a pathway outcome (completed is terminal; a skip never downgrades it). */
export async function setPathwayOutcome(
  path: OnboardingPathwayKey,
  outcome: 'completed' | 'skipped',
): Promise<OnboardingActionResult> {
  return mutateOnboarding((state, now) => applyPathwayOutcome(state, path, outcome, now));
}

/** Record the pathway modal's dismissal (idempotent). */
export async function dismissWelcome(): Promise<OnboardingActionResult> {
  return mutateOnboarding((state, now) => applyWelcomeDismissed(state, now));
}

/**
 * Clear all server-side onboarding state — the "Replay walkthrough" reset.
 * The caller also clears the local `bt_` caches and re-runs the flow.
 */
export async function resetOnboarding(): Promise<OnboardingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const write = await supabase.from('profiles').update({ onboarding: {} }).eq('id', user.id);
  if (write.error) throw new Error(`Failed to reset onboarding state: ${write.error.message}`);

  return { ok: true, data: null };
}
