import type { NarrationCleanupContext, NarrationCleanupOutcome } from './types';

/**
 * Stub: no Anthropic key, no cleanup. Returns the raw transcript untouched so
 * the open core records narrations verbatim. The private repo replaces this
 * with the real Claude-backed cleanup.
 */
export async function cleanupNarration(
  raw: string,
  _ctx: NarrationCleanupContext,
): Promise<NarrationCleanupOutcome> {
  return { text: raw, cleaned: false, status: 'skipped' };
}

/**
 * Stub: the admin panel is premium-only — no /app/admin routes exist on the
 * open core, so server components render no Admin entry points.
 */
export const adminPanelEnabled: boolean = false;
