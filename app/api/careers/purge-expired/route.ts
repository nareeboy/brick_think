// app/api/careers/purge-expired/route.ts
import { NextResponse } from 'next/server';

import { CAREERS_CV_BUCKET } from '@/lib/careers/constants';
import { createServiceRoleSupabaseClient } from '@/lib/db/serviceRole';

export const runtime = 'nodejs';

// Called daily by pg_cron -> pg_net with `Authorization: Bearer <secret>`.
// Deletes the physical CV files (Storage API) of expired applications, then
// the rows. Idempotent + safe to call manually.
export async function POST(request: Request) {
  const secret = process.env.CAREERS_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, code: 'not_configured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();

  const expired = await supabase
    .from('careers_applications')
    .select('id, cv_path')
    .lt('expires_at', nowIso);
  if (expired.error) {
    return NextResponse.json({ ok: false, code: 'query_failed' }, { status: 500 });
  }

  const rows = expired.data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, filesDeleted: 0, rowsDeleted: 0 });
  }

  const paths = rows.map((r) => r.cv_path).filter((p): p is string => Boolean(p));
  let filesDeleted = 0;
  if (paths.length > 0) {
    const removeRes = await supabase.storage.from(CAREERS_CV_BUCKET).remove(paths);
    // Abort BEFORE deleting rows if storage removal failed: otherwise the rows
    // (and their cv_path) vanish and the physical files become permanently
    // unreachable orphans. Storage.remove is idempotent, so a retry is safe.
    if (removeRes.error) {
      return NextResponse.json({ ok: false, code: 'storage_failed' }, { status: 500 });
    }
    filesDeleted = removeRes.data?.length ?? paths.length;
  }

  const ids = rows.map((r) => r.id);
  const delRes = await supabase.from('careers_applications').delete().in('id', ids);
  if (delRes.error) {
    return NextResponse.json({ ok: false, code: 'delete_failed', filesDeleted }, { status: 500 });
  }

  return NextResponse.json({ ok: true, filesDeleted, rowsDeleted: ids.length });
}
