'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';

/**
 * Keeps a participant's room assignment live on the session page.
 *
 * `myRoomIdByStageId` (which gates the "Open my room" button in RoomsPanel) is
 * computed once server-side in page.tsx and passed down as a static prop. When
 * the facilitator partitions members via `setSharedModelRooms` /
 * `setDownstreamStageRooms`, the action's `revalidatePath` only refreshes the
 * Next.js cache — it does NOT push anything to a participant's already-open
 * tab, so the button never appears until they manually refresh.
 *
 * This hook subscribes to the room tables and calls `router.refresh()` on any
 * change, which re-runs the server component (recomputing the direct lookup for
 * shared_model AND the recursive `can_edit_room` fan-out for downstream stages)
 * and flows fresh props down without losing client state.
 *
 * Two subscriptions cover both room types:
 *  - `stage_room_members` filtered to the current user — catches direct
 *    shared_model assignment (the membership row carries `profile_id`).
 *  - `stage_rooms` (RLS scopes payloads to sessions the user can see) — catches
 *    downstream system_model / guiding_principles rooms, where membership is
 *    inherited transitively and no `stage_room_members` row is written.
 *
 * Realtime auth is primed via subscribeAuthedChannel so the join frame
 * carries the JWT — otherwise RLS row-filters drop every payload (see
 * lib/db/realtimeChannel.ts for the rationale).
 */
export function useRoomAssignmentRefresh(sessionId: string, currentUserId: string): void {
  const router = useRouter();

  useEffect(() => {
    return subscribeAuthedChannel({
      channelKey: `room-assignment:${sessionId}:${currentUserId}`,
      attach: (channel) =>
        channel
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'stage_room_members',
              filter: `profile_id=eq.${currentUserId}`,
            },
            () => router.refresh(),
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_rooms' }, () =>
            router.refresh(),
          ),
    });
  }, [sessionId, currentUserId, router]);
}
