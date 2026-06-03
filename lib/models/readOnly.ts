export interface DesignReadOnlyArgs {
  /** The model's `room_id`, or null for non-room (personal / legacy) canvases. */
  roomId: string | null;
  /**
   * For room-backed canvases: is the caller a transitive member of the room
   * (resolved via `public.can_edit_room`)? `null` for non-room canvases.
   */
  isRoomMember: boolean | null;
  /** Result of `canPlaceLive` — whether the caller co-edits this canvas live. */
  liveMode: boolean;
  /** Is the caller the `owner_profile_id` of the model row? */
  isOwner: boolean;
  /** Is the caller the parent session's facilitator? */
  isSessionFacilitator: boolean;
}

/**
 * Single source of truth for whether a design opens read-only.
 *
 * **Room-backed canvases (the collaborative stages — `shared_model`,
 * `system_model`, `guiding_principles`) are read-only for the facilitator and
 * for non-members; only room members build in them.** The facilitator owns
 * every room's `models` row and `can_edit_room` even grants them a live-edit
 * bypass, but per product intent the facilitator *orchestrates* rooms rather
 * than building in them — they observe read-only and only edit their own
 * example model (a personal `individual_model` they own). Observers still see
 * live updates: the design page keeps them on the Supabase-Realtime path, and
 * the Yjs worker projects every room edit to `models.canvas_state`, which is in
 * the Realtime publication.
 *
 * **Non-room canvases** keep the legacy rule: the owner edits, live co-editors
 * (legacy `shared_model`) edit, everyone else is read-only.
 */
export function computeDesignReadOnly({
  roomId,
  isRoomMember,
  liveMode,
  isOwner,
  isSessionFacilitator,
}: DesignReadOnlyArgs): boolean {
  if (roomId !== null) {
    // The facilitator observes every room read-only (they build only in their
    // own example model). Everyone else gates on transitive room membership.
    if (isSessionFacilitator) return true;
    return !isRoomMember;
  }
  return !liveMode && !isOwner;
}
