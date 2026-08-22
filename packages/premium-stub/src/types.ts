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
  /**
   * Single permission authority: the session page computes this ONCE and the
   * slot trusts it. Must be facilitator-only (`session.facilitator_id ===
   * user.id`) to match `generateSessionReport`'s `not_facilitator` gate —
   * passing a broader manage flag re-creates the enabled-button-that-always-
   * fails mismatch for org admins.
   */
  canManage: boolean;
  children?: ReactNode;
};

/** Account-settings branding section. No props — premium resolves the user itself. */
export type BrandingSettingsSlotProps = Record<string, never>;

/** Account sub-navigation (Settings / Billing tabs). Premium owns the billing tab. */
export type AccountNavSlotProps = Record<string, never>;

/** Admin sidebar billing section. No props — premium resolves admin/billing itself. */
export type AdminNavSlotProps = Record<string, never>;

/** Marketing "Pricing" link. Premium renders the real link; stub renders nothing. */
export type PricingLinkSlotProps = { variant: 'nav' | 'footer' };

/** Bottom-right support-chat widget. Stub renders nothing; premium renders the FAB + panel. */
export type ChatWidgetSlotProps = { profileId: string };

/** Header plan text (current subscription package). Stub renders nothing; premium renders a text link to billing. */
export type HeaderPlanSlotProps = { profileId: string };

/**
 * Entry point to the premium AI setup assistant (a link/button into
 * /app/assistant, which exists only in the overlay). Stub renders nothing, so
 * open core shows no dead link to a route it does not have.
 */
export type AssistantEntrySlotProps = { profileId: string };
