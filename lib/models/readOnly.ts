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
}

/**
 * Single source of truth for whether a design opens read-only.
 *
 * **Room-backed canvases gate on membership, NOT ownership.** The facilitator
 * owns the `models` row for every `shared_model` / `system_model` /
 * `guiding_principles` room (1-1 via `models.room_id`), but ownership does not
 * grant edit access — only transitive room membership (`can_edit_room`) does.
 * So a facilitator who isn't a member of the room observes it read-only. They
 * still see live updates: the design page mounts `useModelRealtime`, and the
 * Yjs worker projects every room edit to `models.canvas_state`, which is in the
 * Supabase Realtime publication.
 *
 * **Non-room canvases** keep the legacy rule: the owner edits, live co-editors
 * (legacy `shared_model`) edit, everyone else is read-only.
 */
export function computeDesignReadOnly({
  roomId,
  isRoomMember,
  liveMode,
  isOwner,
}: DesignReadOnlyArgs): boolean {
  if (roomId !== null) return !isRoomMember;
  return !liveMode && !isOwner;
}
