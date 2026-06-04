// tests/integration/careers.integration.test.ts
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let admin: TestUser;
let outsider: TestUser;
let openRoleId: string;
let closedRoleId: string;

beforeAll(async () => {
  admin = await createTestUser();
  outsider = await createTestUser();
  const service = getAdminClient();
  await service.from('profiles').update({ is_site_admin: true }).eq('id', admin.id);

  const openRole = await service
    .from('careers_roles')
    .insert({ slug: `open-${Date.now()}`, title: 'Open Role', is_open: true })
    .select('id')
    .single();
  openRoleId = openRole.data!.id;
  const closedRole = await service
    .from('careers_roles')
    .insert({ slug: `closed-${Date.now()}`, title: 'Closed Role', is_open: false })
    .select('id')
    .single();
  closedRoleId = closedRole.data!.id;
});

afterAll(async () => {
  const service = getAdminClient();
  await service.from('careers_roles').delete().in('id', [openRoleId, closedRoleId]);
  await cleanupTestUser(admin.id);
  await cleanupTestUser(outsider.id);
});

describe('careers_roles RLS', () => {
  test('anon reads open roles but not closed ones', async () => {
    const anon = anonClient();
    const open = await anon.from('careers_roles').select('id').eq('id', openRoleId).maybeSingle();
    expect(open.data?.id).toBe(openRoleId);
    const closed = await anon
      .from('careers_roles')
      .select('id')
      .eq('id', closedRoleId)
      .maybeSingle();
    expect(closed.data).toBeNull();
  });

  test('non-admin authenticated cannot insert a role', async () => {
    const client = await signInAs(outsider);
    const res = await client.from('careers_roles').insert({ slug: `x-${Date.now()}`, title: 'X' });
    expect(res.error).not.toBeNull();
  });
});

describe('careers_applications RLS', () => {
  test('anon and non-admin cannot read applications; admin can', async () => {
    const service = getAdminClient();
    const created = await service
      .from('careers_applications')
      .insert({
        role_id: openRoleId,
        first_name: 'Ada',
        last_name: 'L',
        email: 'ada@example.com',
        address: 'Somewhere',
        phone: '+447700900123',
        linkedin_url: 'https://linkedin.com/in/ada',
      })
      .select('id')
      .single();
    const appId = created.data!.id;

    const anon = anonClient();
    const read = await anon.from('careers_applications').select('id').eq('id', appId);
    expect(read.data ?? []).toHaveLength(0);

    const outsiderClient = await signInAs(outsider);
    const outsiderRead = await outsiderClient
      .from('careers_applications')
      .select('id')
      .eq('id', appId);
    expect(outsiderRead.data ?? []).toHaveLength(0);

    const adminClient = await signInAs(admin);
    const adminRead = await adminClient
      .from('careers_applications')
      .select('id')
      .eq('id', appId)
      .maybeSingle();
    expect(adminRead.data?.id).toBe(appId);

    await service.from('careers_applications').delete().eq('id', appId);
  });

  test('expired rows are selectable by service for the purge sweep', async () => {
    const service = getAdminClient();
    const created = await service
      .from('careers_applications')
      .insert({
        role_id: openRoleId,
        first_name: 'Old',
        last_name: 'App',
        email: 'old@example.com',
        address: 'Past',
        phone: '+447700900999',
        linkedin_url: 'https://linkedin.com/in/old',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      })
      .select('id')
      .single();
    const appId = created.data!.id;

    const expired = await service
      .from('careers_applications')
      .select('id')
      .lt('expires_at', new Date().toISOString());
    expect(expired.data?.some((r) => r.id === appId)).toBe(true);

    await service.from('careers_applications').delete().eq('id', appId);
  });
});
