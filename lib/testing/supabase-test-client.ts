// Test-only helpers for talking to the LOCAL Supabase stack from Vitest
// integration tests. Reads env from `.env.test` (loaded via dotenv-cli in
// the `pnpm test:integration` script). Never use from app code — there is
// no `server-only` guard here on purpose so tests can pull it in.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { CANONICAL_STAGE_TYPES } from '@/lib/sessions/types';
import type { SessionMode, SessionStatus, StageType } from '@/lib/sessions/types';

const TEST_EMAIL_PATTERN = /^[a-z0-9._-]+@brick-think\.test$/i;

function readEnv(): { url: string; anonKey: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'Integration tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY. ' +
        'Run via `pnpm test:integration` so .env.test is loaded.',
    );
  }
  // Refuse to run against anything other than the local stack. The demo
  // JWTs are public, but the safety net is the URL — if someone ever
  // hardcodes a remote URL by mistake, fail loudly.
  if (!url.startsWith('http://127.0.0.1') && !url.startsWith('http://localhost')) {
    throw new Error(
      `Integration tests are local-only. Got URL=${url}; expected http://127.0.0.1:* or http://localhost:*.`,
    );
  }
  return { url, anonKey, serviceKey };
}

let adminCached: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (adminCached) return adminCached;
  const env = readEnv();
  adminCached = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminCached;
}

// A fresh anon client for the duration of one test. We do NOT cache —
// signInWithPassword mutates the client's auth state and a cached
// instance bleeds session state between tests.
export function makeAnonClient(): SupabaseClient {
  const env = readEnv();
  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const DEFAULT_PASSWORD = 'integration-test-password-not-a-secret';

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

// Create an auth.users row + matching profiles row (via the trigger) for
// a fresh disposable user. Email must end in @brick-think.test so the
// global cleanup sweeps catch leaks.
export async function createTestUser(emailLocal?: string): Promise<TestUser> {
  const admin = getAdminClient();
  const slug = emailLocal ?? `int-${crypto.randomUUID().slice(0, 8)}`;
  const email = `${slug}@brick-think.test`;
  if (!TEST_EMAIL_PATTERN.test(email)) {
    throw new Error(`createTestUser: refusing non-test email ${email}`);
  }
  const created = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`createTestUser failed: ${created.error?.message}`);
  }
  return { id: created.data.user.id, email, password: DEFAULT_PASSWORD };
}

// Return a fresh anon client signed in as `user`. Each call rebuilds the
// client so per-test cookie/session state stays isolated.
export async function signInAs(user: TestUser): Promise<SupabaseClient> {
  const client = makeAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`signInAs ${user.email} failed: ${error.message}`);
  }
  return client;
}

export interface TestOrg {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

// Insert a fresh org as `ownerId`. The handle_new_organisation trigger
// inserts the owner membership automatically, so callers don't have to.
export async function createTestOrg({
  ownerId,
  name,
}: {
  ownerId: string;
  name?: string;
}): Promise<TestOrg> {
  const admin = getAdminClient();
  const rand = crypto.randomUUID().slice(0, 8);
  const finalName = name ?? `Test org ${rand}`;
  const slug = `test-org-${rand}`;
  const insertRes = await admin
    .from('organisations')
    .insert({ name: finalName, slug, owner_id: ownerId })
    .select('id, name, slug, owner_id')
    .single();
  if (insertRes.error || !insertRes.data) {
    throw new Error(`createTestOrg failed: ${insertRes.error?.message}`);
  }
  return {
    id: insertRes.data.id as string,
    name: insertRes.data.name as string,
    slug: insertRes.data.slug as string,
    ownerId: insertRes.data.owner_id as string,
  };
}

export type OrgRole = 'owner' | 'admin' | 'member';

export async function addOrgMember({
  orgId,
  profileId,
  role,
}: {
  orgId: string;
  profileId: string;
  role: OrgRole;
}): Promise<void> {
  const admin = getAdminClient();
  const insertRes = await admin
    .from('org_memberships')
    .insert({ org_id: orgId, profile_id: profileId, role });
  if (insertRes.error) {
    throw new Error(`addOrgMember failed: ${insertRes.error.message}`);
  }
}

export interface TestSession {
  id: string;
  orgId: string;
  facilitatorId: string;
  // Keyed by stage_type for ergonomic access in tests.
  stageIds: Record<StageType, string>;
}

export async function createTestSession({
  orgId,
  facilitatorId,
  title,
  mode = 'sync',
  status = 'draft',
}: {
  orgId: string;
  facilitatorId: string;
  title?: string;
  mode?: SessionMode;
  status?: SessionStatus;
}): Promise<TestSession> {
  const admin = getAdminClient();
  const finalTitle = title ?? `Test session ${crypto.randomUUID().slice(0, 8)}`;
  const sessionRes = await admin
    .from('sessions')
    .insert({ org_id: orgId, facilitator_id: facilitatorId, title: finalTitle, mode, status })
    .select('id')
    .single();
  if (sessionRes.error || !sessionRes.data) {
    throw new Error(`createTestSession failed: ${sessionRes.error?.message}`);
  }
  const sessionId = sessionRes.data.id as string;
  const stageRows = CANONICAL_STAGE_TYPES.map((stage_type, position) => ({
    session_id: sessionId,
    stage_type,
    position,
  }));
  const stagesRes = await admin
    .from('stages')
    .insert(stageRows)
    .select('id, stage_type');
  if (stagesRes.error || !stagesRes.data) {
    throw new Error(`createTestSession stage insert failed: ${stagesRes.error?.message}`);
  }
  const stageIds = {} as Record<StageType, string>;
  for (const row of stagesRes.data as Array<{ id: string; stage_type: StageType }>) {
    stageIds[row.stage_type] = row.id;
  }
  return { id: sessionId, orgId, facilitatorId, stageIds };
}

// Delete sessions facilitated by, orgs owned by, model_versions authored by,
// and finally the auth user itself. Mirrors the safety-belt sequence in
// /api/test/delete-user/route.ts. Safe to call when the user no longer
// exists (admin.deleteUser returns an error we swallow).
export async function cleanupTestUser(userId: string): Promise<void> {
  const admin = getAdminClient();
  // Order matters: stages + models cascade from sessions; sessions and orgs
  // are NO-ACTION on profiles, so they must go before deleteUser.
  await admin.from('sessions').delete().eq('facilitator_id', userId);
  await admin.from('organisations').delete().eq('owner_id', userId);
  await admin.from('model_versions').delete().eq('created_by', userId);
  await admin.from('models').delete().eq('owner_profile_id', userId);
  await admin.auth.admin.deleteUser(userId);
}
