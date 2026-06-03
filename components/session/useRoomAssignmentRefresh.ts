'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getBrowserSupabaseClient } from '@/lib/db/client';

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
 * Realtime auth is primed via `setAuth` before the channel is created so the
 * join frame carries the JWT — otherwise RLS row-filters drop every payload.
 * See useSessionStages.ts for the canonical pattern + rationale.
 */
export function useRoomAssignmentRefresh(sessionId: string, currentUserId: string): void {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();

    const channel = supabase
      .channel(`room-assignment:${sessionId}:${currentUserId}`)
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
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId, currentUserId, router]);
}
