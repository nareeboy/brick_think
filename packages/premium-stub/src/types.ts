import type { ReactNode } from 'react';

/** Result of attempting to polish a raw narration transcript. */
export type NarrationCleanupOutcome = {
  /** Display transcript — the cleaned text when cleaned, otherwise the raw input. */
  text: string;
  /** True only when a real cleanup ran and succeeded. */
  cleaned: boolean;
  /** Mirrors the `model_narrations.cleanup_status` column. */
  status: 'succeeded' | 'failed' | 'skipped';
};

export type NarrationCleanupContext = {
  /** Session facilitator whose key funds the cleanup; null for personal canvases. */
  facilitatorId: string | null;
};

/** Server-side premium hooks. Stub = no-ops; real impl in the private repo. */
export interface PremiumServer {
  cleanupNarration(raw: string, ctx: NarrationCleanupContext): Promise<NarrationCleanupOutcome>;
}

/** One file the premium package wants copied into the app tree at build time. */
export type OverlayFile = {
  /** Path of the source file inside the premium package. */
  from: string;
  /** Destination path relative to the repo root (e.g. `app/api/stripe/webhook/route.ts`). */
  to: string;
};

/** Props common to slot components so core can pass context blindly. */
export type ReportActionsSlotProps = {
  sessionId: string;
  /** Opaque entitlement tier resolved by premium; core never interprets it. */
  tier?: string | null;
  children?: ReactNode;
};

/** Account-settings branding section. No props — premium resolves the user itself. */
export type BrandingSettingsSlotProps = Record<string, never>;
