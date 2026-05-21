'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import type { Json } from '@/lib/db/types.generated';
import { parseCanvasState } from '@/lib/models/canvasState';
import { defaultModelTitle } from '@/lib/sessions/stage-labels';
import { composeRoomCanvas, type RoomLaneInput } from '@/lib/sessions/stage-rooms';
import { IMPORT_RULES, isImportTarget } from '@/lib/sessions/stage-import';
import type { StageType } from '@/lib/sessions/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StageRoomError =
  | 'unauthenticated'
  | 'invalid_uuid'
  | 'stage_not_found'
  | 'unsupported_stage_type'
  | 'not_facilitator'
  | 'duplicate_member'
  | 'empty_partition'
  | 'unknown_member'
  | 'empty_sources'
  | 'unknown_source_room'
  | 'upstream_stage_missing';

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

  // Confirm every profile referenced is reachable through this session:
  // either an org member, or a participant who joined via the join code.
  // Code-joined participants don't have an org_memberships row, so a strict
  // org-only check would reject them with `unknown_member`.
  if (seenProfiles.size > 0) {
    const ids = Array.from(seenProfiles);
    const [memberRes, participantRes] = await Promise.all([
      supabase
        .from('org_memberships')
        .select('profile_id')
        .eq('org_id', orgId)
        .in('profile_id', ids),
      supabase
        .from('session_participants')
        .select('profile_id')
        .eq('session_id', sessionId)
        .is('removed_at', null)
        .in('profile_id', ids),
    ]);
    if (memberRes.error) {
      throw new Error(`setSharedModelRooms: membership check failed: ${memberRes.error.message}`);
    }
    if (participantRes.error) {
      throw new Error(
        `setSharedModelRooms: participant check failed: ${participantRes.error.message}`,
      );
    }
    const present = new Set<string>();
    for (const r of memberRes.data ?? []) present.add(r.profile_id);
    for (const r of participantRes.data ?? []) present.add(r.profile_id);
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

interface DownstreamRoomInput {
  /** Optional facilitator-supplied label. Defaults to "Room N". */
  title?: string | null;
  /** Upstream room ids whose canvases compose this room (one lane per source). */
  sourceRoomIds: string[];
}

/**
 * Replace the room layout on a `system_model` or `guiding_principles` stage.
 * Mirrors {@link setSharedModelRooms} but the partition is over upstream
 * rooms instead of profiles:
 *
 *   1. Validates caller is the facilitator and the stage is downstream
 *      (system_model | guiding_principles).
 *   2. Resolves the upstream stage from IMPORT_RULES (`shared_model` for
 *      system_model; `system_model` for guiding_principles) and confirms
 *      every supplied sourceRoomId lives on that upstream stage.
 *   3. Wipes existing rooms on this stage (cascades to canvases + sources).
 *   4. For each partition: inserts a stage_rooms row, composes the canvas
 *      from each upstream room's canvas as a lane (lane label = upstream
 *      room's title or "Room N"), inserts the models row with room_id set,
 *      writes the stage_room_sources edges. Membership is *not* re-declared:
 *      participants gain edit access transitively via can_edit_room.
 *
 * Upstream rooms may be reused across multiple downstream rooms — this isn't
 * a partition over upstream rooms, it's a many-to-many composition.
 */
export async function setDownstreamStageRooms(input: {
  stageId: string;
  rooms: DownstreamRoomInput[];
}): Promise<StageRoomResult<{ roomIds: string[] }>> {
  if (!UUID_RE.test(input.stageId)) return { ok: false, code: 'invalid_uuid' };
  if (input.rooms.length === 0) return { ok: false, code: 'empty_partition' };

  const sourceIds = new Set<string>();
  for (const room of input.rooms) {
    if (room.sourceRoomIds.length === 0) return { ok: false, code: 'empty_sources' };
    for (const id of room.sourceRoomIds) {
      if (!UUID_RE.test(id)) return { ok: false, code: 'invalid_uuid' };
      sourceIds.add(id);
    }
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };

  const stageRes = await supabase
    .from('stages')
    .select('id, stage_type, session_id')
    .eq('id', input.stageId)
    .maybeSingle();
  if (stageRes.error || !stageRes.data) return { ok: false, code: 'stage_not_found' };
  const stageType = stageRes.data.stage_type as StageType;
  if (stageType !== 'system_model' && stageType !== 'guiding_principles') {
    return { ok: false, code: 'unsupported_stage_type' };
  }
  const sessionId = stageRes.data.session_id as string;

  const sessionRes = await supabase
    .from('sessions')
    .select('id, facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionRes.error || !sessionRes.data) return { ok: false, code: 'stage_not_found' };
  if (sessionRes.data.facilitator_id !== user.id) {
    return { ok: false, code: 'not_facilitator' };
  }

  // Resolve the upstream stage_id via IMPORT_RULES. system_model ← shared_model;
  // guiding_principles ← system_model. isImportTarget already excludes
  // skill_building so the cast is safe.
  if (!isImportTarget(stageType)) return { ok: false, code: 'unsupported_stage_type' };
  const upstreamStageType = IMPORT_RULES[stageType].sourceStageType;
  const upstreamStageRes = await supabase
    .from('stages')
    .select('id')
    .eq('session_id', sessionId)
    .eq('stage_type', upstreamStageType)
    .maybeSingle();
  if (upstreamStageRes.error || !upstreamStageRes.data) {
    return { ok: false, code: 'upstream_stage_missing' };
  }
  const upstreamStageId = upstreamStageRes.data.id as string;

  // Verify each source room belongs to the upstream stage in this session.
  const srcRoomsRes = await supabase
    .from('stage_rooms')
    .select('id, position, title')
    .in('id', Array.from(sourceIds))
    .eq('stage_id', upstreamStageId);
  if (srcRoomsRes.error) {
    throw new Error(`setDownstreamStageRooms: source rooms check failed: ${srcRoomsRes.error.message}`);
  }
  const srcRoomById = new Map(
    (srcRoomsRes.data ?? []).map((r) => [r.id as string, { position: r.position as number, title: (r.title as string | null) ?? null }]),
  );
  for (const id of sourceIds) {
    if (!srcRoomById.has(id)) return { ok: false, code: 'unknown_source_room' };
  }

  const svc = getServiceSupabaseClient();

  // Pre-fetch each source room's canvas.
  const srcModelsRes = await svc
    .from('models')
    .select('room_id, canvas_state')
    .in('room_id', Array.from(sourceIds))
    .is('deleted_at', null);
  if (srcModelsRes.error) {
    throw new Error(`setDownstreamStageRooms: source models fetch failed: ${srcModelsRes.error.message}`);
  }
  const canvasByRoomId = new Map<string, ReturnType<typeof parseCanvasState>>();
  for (const row of srcModelsRes.data ?? []) {
    if (row.room_id) {
      canvasByRoomId.set(row.room_id as string, parseCanvasState(row.canvas_state));
    }
  }

  // Wipe prior rooms on this stage. Cascades to canvases (models.room_id) and
  // stage_room_sources (FK on stage_rooms.id).
  const wipeRes = await svc.from('stage_rooms').delete().eq('stage_id', input.stageId);
  if (wipeRes.error) {
    throw new Error(`setDownstreamStageRooms: wipe failed: ${wipeRes.error.message}`);
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
      throw new Error(`setDownstreamStageRooms: room insert failed: ${roomInsert.error?.message}`);
    }
    const roomId = roomInsert.data.id as string;
    roomIds.push(roomId);

    // Compose lanes from the picked upstream rooms. Lane label = upstream
    // room title or "Room N" so the downstream Layers panel disambiguates
    // contributors at the room granularity (mirrors the per-member rename
    // composeRoomCanvas does for shared_model).
    const lanes: RoomLaneInput[] = partition.sourceRoomIds.map((srcId) => {
      const src = srcRoomById.get(srcId);
      const label = src?.title?.trim() || `Room ${(src?.position ?? 0) + 1}`;
      return {
        displayName: label,
        source: canvasByRoomId.get(srcId) ?? { groups: [], bricks: [] },
      };
    });
    const composed = composeRoomCanvas(lanes);

    const modelInsert = await svc.from('models').insert({
      owner_profile_id: sessionRes.data.facilitator_id,
      title: defaultModelTitle(stageType),
      canvas_state: composed as unknown as Json,
      session_id: sessionId,
      stage_id: input.stageId,
      room_id: roomId,
    });
    if (modelInsert.error) {
      throw new Error(`setDownstreamStageRooms: model insert failed: ${modelInsert.error.message}`);
    }

    const sourceRows = partition.sourceRoomIds.map((srcId) => ({
      room_id: roomId,
      source_room_id: srcId,
    }));
    const sourcesRes = await svc.from('stage_room_sources').insert(sourceRows);
    if (sourcesRes.error) {
      throw new Error(`setDownstreamStageRooms: sources insert failed: ${sourcesRes.error.message}`);
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
