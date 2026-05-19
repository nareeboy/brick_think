import type { SessionContext } from '@/lib/sessions/types';

export interface CanPlaceLiveArgs {
  sessionContext: SessionContext | null;
  flagEnabled: boolean;
  /**
   * For room-backed canvases (shared_model rooms today; system_model and
   * guiding_principles when room composition lands): is the caller a
   * transitive member of the room? Computed server-side via
   * `public.can_edit_room(profile, model)`.
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
  if (sessionContext.stageType !== 'shared_model') return false;
  if (isRoomMember !== null) return isRoomMember;
  return true;
}
