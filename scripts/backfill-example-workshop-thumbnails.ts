// scripts/backfill-example-workshop-thumbnails.ts
// One-time, idempotent: renders the missing design-card thumbnails for models
// belonging to example workshops seeded before the seeder learned to generate
// them (lib/exampleWorkshop/seed.ts). Without a thumbnail every seeded design
// shows the empty dot-grid placeholder on /app/my-designs.
//
// Only touches models whose org is flagged is_example and whose thumbnail_path
// is still null, so re-running is a no-op and real user designs — which get
// their thumbnails from the builder — are left alone.
//
// LOCAL example (never point this at prod casually):
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
//   pnpm exec tsx scripts/backfill-example-workshop-thumbnails.ts
import ws from 'ws';

import { createClient } from '@supabase/supabase-js';

import {
  createPublicBrickImageResolver,
  renderCanvasThumbnailPng,
} from '../lib/canvas/serverThumbnail';
import { parseCanvasState } from '../lib/models/canvasState';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Echo the target so the operator can confirm prod vs non-prod before any write.
// eslint-disable-next-line no-console -- intentional status output for a manually-run script
console.log(`Target database: ${url}`);

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  // ws transport: required on Node < 22 which lacks native WebSocket.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ws type signature differs from WebSocketLikeConstructor
  realtime: { transport: ws as any },
});

// PostgREST `in` filters are URL query params, so chunk rather than sending one
// enormous list when an environment has accumulated many example workshops.
const CHUNK = 200;

function chunked<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

async function main() {
  const orgs = await db.from('organisations').select('id').eq('is_example', true);
  if (orgs.error) throw orgs.error;
  const orgIds = (orgs.data ?? []).map((o) => o.id as string);
  if (orgIds.length === 0) {
    // eslint-disable-next-line no-console -- intentional status output
    console.log('No example workshops found. Nothing to do.');
    return;
  }

  const sessionIds: string[] = [];
  for (const ids of chunked(orgIds)) {
    const res = await db.from('sessions').select('id').in('org_id', ids);
    if (res.error) throw res.error;
    sessionIds.push(...(res.data ?? []).map((s) => s.id as string));
  }

  const models: Array<{ id: string; owner_profile_id: string; canvas_state: unknown }> = [];
  for (const ids of chunked(sessionIds)) {
    const res = await db
      .from('models')
      .select('id, owner_profile_id, canvas_state')
      .in('session_id', ids)
      .is('thumbnail_path', null)
      .is('deleted_at', null);
    if (res.error) throw res.error;
    models.push(
      ...(res.data ?? []).map((m) => ({
        id: m.id as string,
        owner_profile_id: m.owner_profile_id as string,
        canvas_state: m.canvas_state,
      })),
    );
  }

  // eslint-disable-next-line no-console -- intentional status output
  console.log(`${models.length} example-workshop model(s) missing a thumbnail.`);

  const resolveBrickImage = createPublicBrickImageResolver();
  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const model of models) {
    try {
      const canvasState = parseCanvasState(model.canvas_state);
      const png = await renderCanvasThumbnailPng({ canvasState, resolveBrickImage });
      if (!png) {
        skipped += 1;
        continue;
      }
      const objectPath = `${model.owner_profile_id}/${model.id}.png`;
      const upload = await db.storage
        .from('model-thumbnails')
        .upload(objectPath, png, { contentType: 'image/png', upsert: true, cacheControl: '3600' });
      if (upload.error) throw new Error(`upload: ${upload.error.message}`);

      const updated = await db
        .from('models')
        .update({ thumbnail_path: objectPath, thumbnail_updated_at: new Date().toISOString() })
        .eq('id', model.id);
      if (updated.error) throw new Error(`row update: ${updated.error.message}`);
      written += 1;
    } catch (err) {
      failed += 1;
      console.error(`model ${model.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // eslint-disable-next-line no-console -- intentional status output
  console.log(`Done. written=${written} skipped(empty canvas)=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

void main();
