export interface CanShareDesignArgs {
  /** Is a model loaded to share? (`modelId !== null`) */
  hasModel: boolean;
  /** The model's `org_id`, or null for personal / session designs. */
  orgId: string | null;
  /** Is this canvas part of a facilitated session? (`sessionContext !== null`) */
  inSession: boolean;
}

/**
 * Whether the canvas should expose the external "share link" affordance.
 *
 * Share links exist for **personal** designs only. `createShareLink` throws on
 * both org-shared (`org_id !== null`) and session-scoped (`session_id !== null`)
 * designs — the forward-compat gates in
 * `app/(authed)/app/designs/[id]/share-actions.ts`, guarded by a tripwire test.
 * Showing the button on a session canvas therefore guarantees an error the
 * moment the user tries to mint a link, so it must stay hidden there.
 */
export function canShareDesign({ hasModel, orgId, inSession }: CanShareDesignArgs): boolean {
  return hasModel && orgId === null && !inSession;
}
