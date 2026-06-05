export interface CanSaveModelVersionArgs {
  /** True when the canvas belongs to a session (any session stage). */
  inSession: boolean;
}

/**
 * Whether the caller may save a model version from this canvas.
 *
 * Versioning is a **personal-designs-only** feature. Session canvases hide it —
 * individual / skill-building canvases and room-backed shared rooms alike: the
 * facilitator drives the workshop and attendees don't curate version history
 * mid-session, and on a room-backed canvas the attendee doesn't even own the
 * `models` row (the `model_versions` insert is owner-only at the RLS layer and
 * would 500). The existing read-only gate still hides the button for non-owning
 * viewers of personal designs.
 */
export function canSaveModelVersion({ inSession }: CanSaveModelVersionArgs): boolean {
  return !inSession;
}
