export interface CanSaveModelVersionArgs {
  /** True when the canvas is a room-backed (breakout room) shared canvas. */
  roomBacked: boolean;
  /** True when the signed-in caller is the parent session's facilitator. */
  isSessionFacilitator: boolean;
}

/**
 * Whether the caller may save a model version from this canvas.
 *
 * `model_versions` inserts are **owner-only** at the RLS layer
 * (`owner_profile_id = auth.uid()`, see the models migration). On a room-backed
 * canvas the facilitator owns the `models` row while attendees are room members
 * who can edit live but do **not** own it — so an attendee's insert is rejected
 * by RLS and the API returns 500. The "Save version" button must therefore stay
 * hidden for attendees on a room canvas; only the facilitator (the owner) saves
 * versions there.
 *
 * Personal designs and non-room session canvases (`individual_model`,
 * `skill_building`) are owned by the caller, so saving stays available — the
 * existing read-only gate already hides the button for non-owning viewers of
 * those.
 */
export function canSaveModelVersion({
  roomBacked,
  isSessionFacilitator,
}: CanSaveModelVersionArgs): boolean {
  if (roomBacked) return isSessionFacilitator;
  return true;
}
