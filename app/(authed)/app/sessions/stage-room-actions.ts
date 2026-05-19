'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';
import { defaultModelTitle } from '@/lib/sessions/stage-labels';
import { composeRoomCanvas, type RoomLaneInput } from '@/lib/sessions/stage-rooms';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StageRoomError =
  | 'unauthenticated'
  | 'invalid_uuid'
  | 'stage_not_found'
  | 'unsupported_stage_type'
  | 'not_facilitator'
  | 'duplicate_member'
  | 'empty_partition'
  | 'unknown_member';

export type StageRoomResult<T> = { ok: true; data: T } | { ok: false; code: StageRoomError };

interface RoomInput {
  /** Optional facilitator-supplied label. Defaults to "Room N". */
  title?: string | null;
  /** Profile ids assigned to this room — must be org members of the session. */
  profileIds: string[];
}

/**
 * Replace the room layout on a `shared_model` stage. Atomic per-call:
 *
 *   1. Validates caller is the session facilitator.
 *   2. Wipes existing rooms (and their canvases — FK cascade).
 *   3. For each partition: creates a stage_rooms row, fetches each member's
 *      `individual_model` bricks, composes a lane-laid-out canvas via
 *      {@link composeRoomCanvas}, inserts a single `models` row owned by the
 *      facilitator with `room_id` set, and writes the member roster.
 *
 * Members must be mutually exclusive within the call — a profile id may appear
 * in at most one partition. Verified before any write.
 */
export async function setSharedModelRooms(input: {
  stageId: string;
  rooms: RoomInput[];
}): Promise<StageRoomResult<{ roomIds: string[] }>> {
  if (!UUID_RE.test(input.stageId)) return { ok: false, code: 'invalid_uuid' };
  if (input.rooms.length === 0) return { ok: false, code: 'empty_partition' };

  // Reject any duplicate profile id across partitions up-front.
  const seenProfiles = new Set<string>();
  for (const room of input.rooms) {
    for (const pid of room.profileIds) {
      if (!UUID_RE.test(pid)) return { ok: false, code: 'invalid_uuid' };
      if (seenProfiles.has(pid)) return { ok: false, code: 'duplicate_member' };
      seenProfiles.add(pid);
    }
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  // Authorize: caller must be the facilitator of the session that owns the stage.
  const stageRes = await supabase
    .from('stages')
    .select('id, stage_type, session_id')
    .eq('id', input.stageId)
    .maybeSingle();
  if (stageRes.error || !stageRes.data) return { ok: false, code: 'stage_not_found' };
  if (stageRes.data.stage_type !== 'shared_model') {
    return { ok: false, code: 'unsupported_stage_type' };
  }
  const sessionId = stageRes.data.session_id as string;

  const sessionRes = await supabase
    .from('sessions')
    .select('id, facilitator_id, org_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionRes.error || !sessionRes.data) return { ok: false, code: 'stage_not_found' };
  if (sessionRes.data.facilitator_id !== user.id) {
    return { ok: false, code: 'not_facilitator' };
  }
  const orgId = sessionRes.data.org_id as string;

  // Confirm every profile referenced is actually an org member of the session.
  if (seenProfiles.size > 0) {
    const ids = Array.from(seenProfiles);
    const memberRes = await supabase
      .from('org_memberships')
      .select('profile_id')
      .eq('org_id', orgId)
      .in('profile_id', ids);
    if (memberRes.error) {
      throw new Error(`setSharedModelRooms: membership check failed: ${memberRes.error.message}`);
    }
    const present = new Set((memberRes.data ?? []).map((r) => r.profile_id));
    for (const id of ids) {
      if (!present.has(id)) return { ok: false, code: 'unknown_member' };
    }
  }

  const svc = getServiceSupabaseClient();

  // Locate the upstream individual_model stage so we can pull each member's
  // bricks for the lane layout. Missing source is non-fatal: members with no
  // bricks just get an empty lane.
  const indivStageRes = await svc
    .from('stages')
    .select('id')
    .eq('session_id', sessionId)
    .eq('stage_type', 'individual_model')
    .maybeSingle();
  const indivStageId = indivStageRes.data?.id as string | undefined;

  // Wipe existing rooms on the stage (cascades to room canvases via the
  // models.room_id ON DELETE CASCADE FK and to room members via stage_rooms FK).
  const wipeRes = await svc.from('stage_rooms').delete().eq('stage_id', input.stageId);
  if (wipeRes.error) {
    throw new Error(`setSharedModelRooms: wipe failed: ${wipeRes.error.message}`);
  }

  // Pre-fetch participant display names (full_name preferred, email as fallback)
  // for the per-lane Layers-panel rename.
  const profileRes =
    seenProfiles.size > 0
      ? await svc
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(seenProfiles))
      : { data: [] as { id: string; full_name: string | null; email: string }[], error: null };
  if (profileRes.error) {
    throw new Error(`setSharedModelRooms: profiles fetch failed: ${profileRes.error.message}`);
  }
  const profileById = new Map(
    (profileRes.data ?? []).map((p) => [
      p.id,
      p.full_name?.trim() || p.email?.split('@')[0] || 'Guest',
    ]),
  );

  // Source canvases per profile (only fetch if we know the individual_model stage).
  const canvasByProfile = new Map<string, ReturnType<typeof parseCanvasState>>();
  if (indivStageId && seenProfiles.size > 0) {
    const srcRes = await svc
      .from('models')
      .select('owner_profile_id, canvas_state')
      .eq('session_id', sessionId)
      .eq('stage_id', indivStageId)
      .is('deleted_at', null)
      .in('owner_profile_id', Array.from(seenProfiles));
    if (srcRes.error) {
      throw new Error(`setSharedModelRooms: individual_model fetch failed: ${srcRes.error.message}`);
    }
    for (const row of srcRes.data ?? []) {
      canvasByProfile.set(row.owner_profile_id as string, parseCanvasState(row.canvas_state));
    }
  }

  const roomIds: string[] = [];

  let i = 0;
  for (const partition of input.rooms) {
    const trimmed = partition.title?.trim();
    const title = trimmed && trimmed.length > 0 ? trimmed.slice(0, 80) : null;

    const roomInsert = await svc
      .from('stage_rooms')
      .insert({ stage_id: input.stageId, position: i, title })
      .select('id')
      .single();
    if (roomInsert.error || !roomInsert.data) {
      throw new Error(`setSharedModelRooms: room insert failed: ${roomInsert.error?.message}`);
    }
    const roomId = roomInsert.data.id as string;
    roomIds.push(roomId);

    // Compose this room's canvas from its assigned members' individual_model bricks.
    const lanes: RoomLaneInput[] = partition.profileIds.map((pid) => ({
      displayName: profileById.get(pid) ?? 'Guest',
      source: canvasByProfile.get(pid) ?? { groups: [], bricks: [] },
    }));
    const composed = composeRoomCanvas(lanes);

    const modelInsert = await svc
      .from('models')
      .insert({
        owner_profile_id: sessionRes.data.facilitator_id,
        title: defaultModelTitle('shared_model'),
        canvas_state: composed as unknown as Json,
        session_id: sessionId,
        stage_id: input.stageId,
        room_id: roomId,
      })
      .select('id');
    if (modelInsert.error) {
      throw new Error(`setSharedModelRooms: model insert failed: ${modelInsert.error.message}`);
    }

    if (partition.profileIds.length > 0) {
      const memberRows = partition.profileIds.map((pid) => ({
        room_id: roomId,
        stage_id: input.stageId,
        profile_id: pid,
      }));
      const memberRes = await svc.from('stage_room_members').insert(memberRows);
      if (memberRes.error) {
        throw new Error(`setSharedModelRooms: members insert failed: ${memberRes.error.message}`);
      }
    }
    i++;
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true, data: { roomIds } };
}

/** Delete a room (cascades to room canvas + members). Facilitator-only. */
export async function deleteSharedModelRoom(
  roomId: string,
): Promise<StageRoomResult<{ sessionId: string }>> {
  if (!UUID_RE.test(roomId)) return { ok: false, code: 'invalid_uuid' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const roomRes = await supabase
    .from('stage_rooms')
    .select('id, stage_id, stages!inner(session_id, sessions!inner(facilitator_id))')
    .eq('id', roomId)
    .maybeSingle();
  if (roomRes.error || !roomRes.data) return { ok: false, code: 'stage_not_found' };

  const stage = (roomRes.data as unknown as {
    stages: { session_id: string; sessions: { facilitator_id: string } };
  }).stages;
  const sessionId = stage.session_id;
  if (stage.sessions.facilitator_id !== user.id) return { ok: false, code: 'not_facilitator' };

  const svc = getServiceSupabaseClient();
  const delRes = await svc.from('stage_rooms').delete().eq('id', roomId);
  if (delRes.error) {
    throw new Error(`deleteSharedModelRoom: ${delRes.error.message}`);
  }

  revalidatePath(`/app/sessions/${sessionId}`);
  return { ok: true, data: { sessionId } };
}
