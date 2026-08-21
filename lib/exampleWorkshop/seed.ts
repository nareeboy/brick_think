// Seeds a complete, realistic workshop so a user can see what a finished
// workshop looks like without running one: a fresh org, a completed session
// with all five canonical stages, three participants with brick-filled
// canvases, rooms on the collaborative stages, and narration transcripts on
// every model. It doubles as the site-admin fixture for exercising the paid
// post-session flows (report generation, one-off purchase, white-label
// branding) without hand-driving a live session.
//
// SECURITY: writes with the service-role client, so callers MUST authenticate
// the caller and enforce the one-per-user rule first
// (createExampleWorkshopAction does) — this function itself is unguarded.
//
// The three demo participants are SHARED by every example workshop: they are
// minted once against fixed @brick-think.test addresses — the same
// disposable-user convention as the e2e backdoors — and can never sign in (no
// password, no known magic-link inbox). Minting a fresh trio per workshop
// would add three auth.users rows every time anyone clicks the button now
// that the feature is open to all users. Deleting one of these profiles
// orphans the models it owns across every seeded example, so leave them be.

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import {
  createPublicBrickImageResolver,
  renderCanvasThumbnailPng,
} from '@/lib/canvas/serverThumbnail';
import { toJson } from '@/lib/db/json';
import type { ServiceSupabaseClient } from '@/lib/db/service';
import type { CanvasState } from '@/lib/models/types';
import { defaultModelTitle, STAGE_DEFAULT_DURATIONS_SECONDS } from '@/lib/sessions/stage-labels';
import { composeRoomCanvas } from '@/lib/sessions/stage-rooms';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

export interface SeedExampleWorkshopResult {
  orgId: string;
  sessionId: string;
  participantIds: string[];
}

interface ParticipantSeed {
  fullName: string;
  email: string;
}

const PARTICIPANT_SEEDS: readonly ParticipantSeed[] = [
  { fullName: 'Aisha Rahman', email: 'demo-participant-aisha@brick-think.test' },
  { fullName: 'Jonas Weber', email: 'demo-participant-jonas@brick-think.test' },
  { fullName: 'Priya Nair', email: 'demo-participant-priya@brick-think.test' },
];

// One transcript per (stage, participant) — a coherent fictional workshop
// ("how our product team collaborates across functions") so the AI report's
// themes, findings, and recommendations have real material to ground in.
const TRANSCRIPTS: Record<StageType, readonly string[]> = {
  skill_building: [
    'I built a tower with a wobbly base to warm up. What surprised me is how quickly the metaphor took over — the loose brick at the bottom immediately felt like our release process, solid on top but resting on one fragile step nobody wants to touch.',
    'My warm-up model is a bridge with a missing middle span. I noticed I kept reaching for connector pieces that were not there, which is honestly how hand-offs between design and engineering feel — both sides build towards the middle and hope it meets.',
    'I stacked bricks in alternating colours to practise, and it turned into a picture of our sprint rhythm: strong alternation between planning and delivery, but nothing marking when we actually stop to reflect. The model has no place to stand back and look.',
  ],
  individual_model: [
    'My model shows my week: a tall central column that is the roadmap work, and small scattered bricks around it that are interruptions. The column leans because the interruptions attach to it directly — every ad-hoc request lands on the same person doing the core work, there is no buffer.',
    'I built two towers connected by a single thin brick. The towers are the platform team and the feature teams, and the thin brick is me — I am the only person who attends both stand-ups, so every dependency conversation routes through one point of failure.',
    'Mine is a wide, flat base with nothing tall on it. We are good at spreading work evenly, but nothing gets the height — the focus — it needs to actually ship. Three half-built columns instead of one finished tower, and every column is somebody waiting on a review.',
  ],
  shared_model: [
    'When we merged our models the leaning column and the thin bridge turned out to be the same problem seen from two sides: the people doing roadmap work are also the only routing points for dependencies. We rebuilt it with the interruptions pooled at a shared intake brick instead of taped to individuals.',
    'What I take from our shared build is that we kept our towers but replaced the single connecting brick with a proper platform layer. It costs bricks — visible, budgeted capacity — which is exactly the argument we have been failing to make in words for two quarters.',
    'Our room kept my flat base but agreed to sacrifice width for height: we picked one column and gave it all the tall pieces. Saying out loud which columns stay half-built was uncomfortable, and that discomfort is the point — we never make that call explicitly in planning.',
  ],
  system_model: [
    'Looking at both rooms together, the system model shows the same brick doing double duty everywhere: the people who connect teams are also the people who deliver. We marked those bricks in red, and the pattern is that every red brick sits at a place where the structure would collapse if it were removed.',
    'The connection between the two room models is the intake layer — once both rooms added one, the bridges between towers stopped needing a specific person. The system works when the connection is a structure, not an individual. That is the single change with the most leverage.',
    'What the combined model makes obvious is timing: the platform layer has to be built before the tall column can go up, but our planning treats them as parallel. In the model you physically cannot place the column first. The sequence is in the bricks now, and it should be in the roadmap.',
  ],
  guiding_principles: [
    'First principle from the model: no load-bearing people. If removing one brick collapses the structure, the structure is wrong — we rebuild so the connection survives the person leaving. That covers the red bricks we found in the system model.',
    'Second principle: pay for the platform layer in visible bricks. Shared infrastructure gets explicit, budgeted capacity in every planning cycle, not scraped-together leftovers. If it is not on the board as bricks, it does not exist.',
    'Third principle: choose height over width once per cycle. Each planning round we name the one column that gets the tall pieces and — just as explicitly — the columns that stay half-built. Saying the second half out loud is the actual discipline.',
  ],
};

const ORG_NAME = 'Example workshop';
const SESSION_TITLE = 'Example workshop — How we collaborate';
const SESSION_BRIEF =
  'An example workshop to explore: a fictional product team works out how ' +
  'work and dependencies flow across functions, building from individual ' +
  'models to a shared system model and guiding principles. Everything here ' +
  'was generated for you — open any stage to see the models and what each ' +
  'participant said about them.';

// Deterministic-ish brick layout: a handful of canonical bricks arranged in
// a small grid, offset per participant so the canvases look distinct.
function buildCanvas(paletteOffset: number, brickCount: number): CanvasState {
  const groupId = crypto.randomUUID();
  const bricks = Array.from({ length: brickCount }, (_, i) => {
    const def = CANONICAL_BRICKS[(paletteOffset * 11 + i * 7) % CANONICAL_BRICKS.length]!;
    return {
      id: crypto.randomUUID(),
      groupId,
      code: def.code,
      name: def.name,
      image: def.image,
      width: def.width,
      height: def.height,
      x: 120 + (i % 3) * 210,
      y: 120 + Math.floor(i / 3) * 190,
      rotation: 0,
      visible: true,
    };
  });
  return {
    groups: [{ id: groupId, name: 'Model', collapsed: false, visible: true }],
    bricks,
  };
}

function fail(step: string, detail: string | undefined): never {
  throw new Error(`seedExampleWorkshop: ${step} failed: ${detail ?? 'unknown'}`);
}

// Returns the shared demo participant's profile id, minting the account on
// first use. profiles.email is a unique citext, so the lookup is exact.
async function resolveDemoParticipant(
  svc: ServiceSupabaseClient,
  seed: ParticipantSeed,
): Promise<string> {
  const existing = await svc.from('profiles').select('id').eq('email', seed.email).maybeSingle();
  if (existing.data) return existing.data.id;

  const created = await svc.auth.admin.createUser({
    email: seed.email,
    email_confirm: true,
    user_metadata: { full_name: seed.fullName },
  });
  if (created.data?.user) {
    // The handle_new_user trigger copies full_name from the metadata; update
    // as a belt-and-braces so report attribution never falls back to email.
    await svc.from('profiles').update({ full_name: seed.fullName }).eq('id', created.data.user.id);
    return created.data.user.id;
  }

  // Two users seeding their first example at the same moment: the loser of
  // the unique-email race reads back the winner's row instead of failing.
  const retry = await svc.from('profiles').select('id').eq('email', seed.email).maybeSingle();
  if (retry.data) return retry.data.id;
  fail('participant create', created.error?.message);
}

export async function seedExampleWorkshop(
  svc: ServiceSupabaseClient,
  { facilitatorId }: { facilitatorId: string },
): Promise<SeedExampleWorkshopResult> {
  const suffix = crypto.randomUUID().slice(0, 8);

  // 1. Fresh org — the handle_new_organisation trigger inserts the owner
  //    membership row for the facilitator.
  const orgRes = await svc
    .from('organisations')
    .insert({
      name: ORG_NAME,
      slug: `example-workshop-${suffix}`,
      owner_id: facilitatorId,
      is_example: true,
    })
    .select('id')
    .single();
  if (orgRes.error || !orgRes.data) fail('org insert', orgRes.error?.message);
  const orgId = orgRes.data.id;

  // 2. Completed session with a join code (mirrors createSession).
  const joinCodeRes = await svc.rpc('generate_join_code');
  if (joinCodeRes.error || !joinCodeRes.data) fail('join code', joinCodeRes.error?.message);
  const sessionRes = await svc
    .from('sessions')
    .insert({
      org_id: orgId,
      facilitator_id: facilitatorId,
      title: SESSION_TITLE,
      join_code: joinCodeRes.data,
      status: 'completed',
      brief_text: SESSION_BRIEF,
    })
    .select('id')
    .single();
  if (sessionRes.error || !sessionRes.data) fail('session insert', sessionRes.error?.message);
  const sessionId = sessionRes.data.id;

  // 3. Five canonical stages, all completed, on a compressed timeline ending
  //    shortly before "now" so the session reads as freshly finished.
  const STAGE_RUN_MS = 20 * 60 * 1000;
  const STAGE_GAP_MS = 5 * 60 * 1000;
  let cursor =
    Date.now() - CANONICAL_STAGE_TYPES.length * (STAGE_RUN_MS + STAGE_GAP_MS) - 10 * 60 * 1000;
  const stageRows = CANONICAL_STAGE_TYPES.map((stage_type, position) => {
    const started = cursor;
    cursor += STAGE_RUN_MS + STAGE_GAP_MS;
    return {
      session_id: sessionId,
      stage_type,
      position,
      duration_seconds: STAGE_DEFAULT_DURATIONS_SECONDS[stage_type],
      status: 'completed' as const,
      started_at: new Date(started).toISOString(),
      ended_at: new Date(started + STAGE_RUN_MS).toISOString(),
    };
  });
  const stagesRes = await svc.from('stages').insert(stageRows).select('id, stage_type');
  if (stagesRes.error || !stagesRes.data) fail('stages insert', stagesRes.error?.message);
  const stageIdByType = new Map(
    stagesRes.data.map((s) => [s.stage_type as StageType, s.id as string]),
  );
  const stageId = (stageType: StageType): string => {
    const id = stageIdByType.get(stageType);
    if (!id) fail(`stage lookup ${stageType}`, 'missing');
    return id;
  };

  // 4. Enrol the three shared demo participants in the org + session roster.
  const participantIds: string[] = [];
  for (const seed of PARTICIPANT_SEEDS) {
    const profileId = await resolveDemoParticipant(svc, seed);
    participantIds.push(profileId);

    const memberRes = await svc
      .from('org_memberships')
      .insert({ org_id: orgId, profile_id: profileId, role: 'member' });
    if (memberRes.error) fail('org membership', memberRes.error.message);

    const rosterRes = await svc
      .from('session_participants')
      .insert({ session_id: sessionId, profile_id: profileId });
    if (rosterRes.error) fail('roster insert', rosterRes.error.message);
  }

  // Design-card thumbnails are normally captured client-side from the live
  // Konva layer when someone edits a model (see useThumbnailCapture.ts). These
  // canvases are written straight to the database and never opened in the
  // builder, so without this every seeded design would show the empty dot-grid
  // placeholder on /app/my-designs and in the session views.
  //
  // Best-effort: a failed render or upload leaves the card on its placeholder,
  // which is strictly better than losing the whole example workshop. One shared
  // resolver across all ten models so each brick PNG is read and encoded once.
  const resolveBrickImage = createPublicBrickImageResolver();
  const attachThumbnail = async (
    modelId: string,
    ownerProfileId: string,
    canvas: CanvasState,
  ): Promise<void> => {
    try {
      const png = await renderCanvasThumbnailPng({ canvasState: canvas, resolveBrickImage });
      if (!png) return;
      // Path convention from 20260513100000_model_thumbnails.sql:
      // '<owner auth uid>/<model id>.png'. profiles.id is the auth uid.
      const objectPath = `${ownerProfileId}/${modelId}.png`;
      const upload = await svc.storage
        .from('model-thumbnails')
        .upload(objectPath, png, { contentType: 'image/png', upsert: true, cacheControl: '3600' });
      if (upload.error) throw new Error(`upload: ${upload.error.message}`);

      const updated = await svc
        .from('models')
        .update({ thumbnail_path: objectPath, thumbnail_updated_at: new Date().toISOString() })
        .eq('id', modelId);
      if (updated.error) throw new Error(`row update: ${updated.error.message}`);
    } catch (err) {
      console.error('seedExampleWorkshop: thumbnail failed for model', modelId, err);
    }
  };

  const insertNarration = async (
    modelId: string,
    profileId: string,
    stageType: StageType,
    transcript: string,
  ): Promise<void> => {
    const res = await svc.from('model_narrations').insert({
      model_id: modelId,
      profile_id: profileId,
      stage_type: stageType,
      transcript,
      transcript_raw: transcript,
      cleaned: false,
      cleanup_status: 'skipped',
      duration_ms: 45_000 + transcript.length * 100,
    });
    if (res.error) fail('narration insert', res.error.message);
  };

  // 5. Individual stages: one brick-filled model per participant, each with
  //    its owner's narration.
  const individualCanvases: CanvasState[] = [];
  for (const stageType of ['skill_building', 'individual_model'] as const) {
    for (let i = 0; i < PARTICIPANT_SEEDS.length; i += 1) {
      const canvas = buildCanvas(i + (stageType === 'individual_model' ? 3 : 0), 6 + i);
      if (stageType === 'individual_model') individualCanvases.push(canvas);
      const modelRes = await svc
        .from('models')
        .insert({
          owner_profile_id: participantIds[i]!,
          title: defaultModelTitle(stageType),
          canvas_state: toJson(canvas),
          session_id: sessionId,
          stage_id: stageId(stageType),
        })
        .select('id')
        .single();
      if (modelRes.error || !modelRes.data) fail('model insert', modelRes.error?.message);
      await attachThumbnail(modelRes.data.id, participantIds[i]!, canvas);
      await insertNarration(
        modelRes.data.id,
        participantIds[i]!,
        stageType,
        TRANSCRIPTS[stageType][i]!,
      );
    }
  }

  // Rooms follow the production shape: shared_model partitions participants
  // directly; system_model / guiding_principles compose upstream rooms via
  // stage_room_sources and inherit membership transitively.
  const insertRoom = async (
    stageType: StageType,
    position: number,
    title: string,
    canvas: CanvasState,
    memberIndexes: readonly number[],
    sourceRoomIds: readonly string[],
  ): Promise<string> => {
    const roomRes = await svc
      .from('stage_rooms')
      .insert({ stage_id: stageId(stageType), position, title })
      .select('id')
      .single();
    if (roomRes.error || !roomRes.data) fail('room insert', roomRes.error?.message);
    const roomId = roomRes.data.id;

    const modelRes = await svc
      .from('models')
      .insert({
        owner_profile_id: facilitatorId,
        title: defaultModelTitle(stageType),
        canvas_state: toJson(canvas),
        session_id: sessionId,
        stage_id: stageId(stageType),
        room_id: roomId,
      })
      .select('id')
      .single();
    if (modelRes.error || !modelRes.data) fail('room model insert', modelRes.error?.message);
    await attachThumbnail(modelRes.data.id, facilitatorId, canvas);

    if (memberIndexes.length > 0) {
      const memberRes = await svc.from('stage_room_members').insert(
        memberIndexes.map((i) => ({
          room_id: roomId,
          stage_id: stageId(stageType),
          profile_id: participantIds[i]!,
        })),
      );
      if (memberRes.error) fail('room members insert', memberRes.error.message);
    }
    if (sourceRoomIds.length > 0) {
      const sourcesRes = await svc
        .from('stage_room_sources')
        .insert(sourceRoomIds.map((source) => ({ room_id: roomId, source_room_id: source })));
      if (sourcesRes.error) fail('room sources insert', sourcesRes.error.message);
    }

    // Narrations attach to the room's model, one per narrating member.
    for (const i of memberIndexes.length > 0 ? memberIndexes : [0, 1, 2]) {
      await insertNarration(
        modelRes.data.id,
        participantIds[i]!,
        stageType,
        TRANSCRIPTS[stageType][i]!,
      );
    }
    return roomId;
  };

  // 6. shared_model: two rooms partitioning the three participants, each
  //    canvas composed from its members' individual models.
  const lane = (i: number) => ({
    displayName: PARTICIPANT_SEEDS[i]!.fullName,
    source: individualCanvases[i] ?? { groups: [], bricks: [] },
  });
  const sharedRoomA = await insertRoom(
    'shared_model',
    0,
    'Room 1',
    composeRoomCanvas([lane(0), lane(1)]),
    [0, 1],
    [],
  );
  const sharedRoomB = await insertRoom(
    'shared_model',
    1,
    'Room 2',
    composeRoomCanvas([lane(2)]),
    [2],
    [],
  );

  // 7. system_model: one room composing both shared rooms.
  const systemCanvas = composeRoomCanvas([
    { displayName: 'Room 1', source: composeRoomCanvas([lane(0), lane(1)]) },
    { displayName: 'Room 2', source: composeRoomCanvas([lane(2)]) },
  ]);
  const systemRoom = await insertRoom(
    'system_model',
    0,
    'Whole group',
    systemCanvas,
    [],
    [sharedRoomA, sharedRoomB],
  );

  // 8. guiding_principles: one room composing the system room.
  await insertRoom(
    'guiding_principles',
    0,
    'Principles',
    composeRoomCanvas([{ displayName: 'Whole group', source: systemCanvas }]),
    [],
    [systemRoom],
  );

  return { orgId, sessionId, participantIds };
}
