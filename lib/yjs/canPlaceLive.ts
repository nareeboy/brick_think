import type { SessionContext } from '@/lib/sessions/types';

export interface CanPlaceLiveArgs {
  sessionContext: SessionContext | null;
  flagEnabled: boolean;
  /**
   * For room-backed canvases (shared_model, system_model, and
   * guiding_principles rooms): is the caller a transitive member of the room?
   * Computed server-side via `public.can_edit_room(profile, model)`. For
   * downstream stages this resolves recursively back to the sourced upstream
   * room, so a member of the upstream shared_model room edits the composed
   * canvas.
   *
   * `null` means "the model has no room_id" (legacy or non-room canvas) — the
   * gate then defers to stage-type alone and the legacy "all session-org
   * members co-edit shared_model" behaviour applies.
   */
  isRoomMember: boolean | null;
}

export function canPlaceLive({
  sessionContext,
  flagEnabled,
  isRoomMember,
}: CanPlaceLiveArgs): boolean {
  if (!flagEnabled) return false;
  if (!sessionContext) return false;
  // Room-backed canvases gate purely on transitive membership. `room_id` is
  // only ever set on the collaborative stages (shared_model, system_model,
  // guiding_principles), so a non-null flag already implies the stage is
  // collaborative — a member of the sourced upstream room (resolved server-side
  // via can_edit_room) co-edits the composed downstream canvas live.
  if (isRoomMember !== null) return isRoomMember;
  // Non-room canvases: only legacy shared_model keeps the "every session-org
  // member co-edits" behaviour. Downstream personal canvases stay autosave.
  return sessionContext.stageType === 'shared_model';
}
