// SECURITY: Mirrors seed-session-member.ts — three independent gates:
//   1. E2E_SESSIONS_ENABLED === '1'
//   2. Host header is localhost / 127.0.0.1
//   3. callerEmail matches @brick-think.test
//
// Creates a single shared_model room on the given session's shared_model stage,
// enrols the supplied profile ids as members, and inserts the canonical
// room-backed `models` row owned by the facilitator. Returns the room id and
// the model id so the e2e spec can navigate directly to /app/designs/<modelId>.
//
// Why a dedicated test route (vs calling setSharedModelRooms from the UI):
// reactions/comments e2e wants to focus on live sync of brick feedback, not on
// the multi-step room-creation UI. Room creation is exercised by its own spec.
//
// If any gate fails, the route responds 404 with no body so its existence is
// not signalled to a probe.

import { NextResponse, type NextRequest } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/db/service';
import type { Json } from '@/lib/db/types.generated';
import { composeRoomCanvas } from '@/lib/sessions/stage-rooms';
import { defaultModelTitle } from '@/lib/sessions/stage-labels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEST_EMAIL_PATTERN = /^[a-z0-9._-]+@brick-think\.test$/i;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isEnabled(request: NextRequest): boolean {
  if (process.env.E2E_SESSIONS_ENABLED !== '1') return false;
  return isAllowedHost(request.headers.get('host'));
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

interface SeedRoomBody {
  sessionId?: unknown;
  callerEmail?: unknown;
  memberProfileIds?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: SeedRoomBody;
  try {
    body = (await request.json()) as SeedRoomBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const callerEmail =
    typeof body.callerEmail === 'string' ? body.callerEmail.trim().toLowerCase() : '';
  if (!TEST_EMAIL_PATTERN.test(callerEmail)) {
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 400 });
  }
  if (!UUID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  }
  if (!Array.isArray(body.memberProfileIds) || body.memberProfileIds.length === 0) {
    return NextResponse.json({ error: 'invalid_members' }, { status: 400 });
  }
  const memberIds = body.memberProfileIds
    .filter((v): v is string => typeof v === 'string' && UUID_PATTERN.test(v));
  if (memberIds.length !== body.memberProfileIds.length) {
    return NextResponse.json({ error: 'invalid_members' }, { status: 400 });
  }

  const admin = getServiceSupabaseClient();

  // Resolve the session to get facilitator id (model owner) and confirm exists.
  const { data: session, error: sessionErr } = await admin
    .from('sessions')
    .select('id, facilitator_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  // Find the shared_model stage for this session.
  const { data: stage, error: stageErr } = await admin
    .from('stages')
    .select('id')
    .eq('session_id', sessionId)
    .eq('stage_type', 'shared_model')
    .maybeSingle();
  if (stageErr || !stage) {
    return NextResponse.json({ error: 'shared_model_stage_not_found' }, { status: 404 });
  }
  const stageId = stage.id as string;

  // Wipe any existing rooms on the stage so re-runs (or seeded sessions whose
  // backfill seeded a default Room 1) start clean.
  const wipeRes = await admin.from('stage_rooms').delete().eq('stage_id', stageId);
  if (wipeRes.error) {
    return NextResponse.json(
      { error: 'wipe_failed', detail: wipeRes.error.message },
      { status: 500 },
    );
  }

  // Insert a single room.
  const roomInsert = await admin
    .from('stage_rooms')
    .insert({ stage_id: stageId, position: 0, title: 'Test room' })
    .select('id')
    .single();
  if (roomInsert.error || !roomInsert.data) {
    return NextResponse.json(
      { error: 'room_create_failed', detail: roomInsert.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }
  const roomId = roomInsert.data.id as string;

  // Compose an empty per-member canvas (no upstream bricks to import — the
  // spec drops its own bricks once both contexts open the canvas).
  const lanes = memberIds.map(() => ({
    displayName: 'Tester',
    source: { groups: [], bricks: [] },
  }));
  const composed = composeRoomCanvas(lanes);

  const modelInsert = await admin
    .from('models')
    .insert({
      owner_profile_id: session.facilitator_id,
      title: defaultModelTitle('shared_model'),
      canvas_state: composed as unknown as Json,
      session_id: sessionId,
      stage_id: stageId,
      room_id: roomId,
    })
    .select('id')
    .single();
  if (modelInsert.error || !modelInsert.data) {
    return NextResponse.json(
      { error: 'model_create_failed', detail: modelInsert.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }
  const modelId = modelInsert.data.id as string;

  const memberRows = memberIds.map((pid) => ({
    room_id: roomId,
    stage_id: stageId,
    profile_id: pid,
  }));
  const memberRes = await admin.from('stage_room_members').insert(memberRows);
  if (memberRes.error) {
    return NextResponse.json(
      { error: 'members_insert_failed', detail: memberRes.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ roomId, modelId });
}
