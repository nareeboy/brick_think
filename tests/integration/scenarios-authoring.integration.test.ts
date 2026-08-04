// Integration coverage for custom scenario authoring (created_by column +
// INSERT/UPDATE/DELETE RLS policies + the three server actions).
//
// Verifies:
//   * An org member can create a scenario in their own org via the action;
//     the row lands with created_by = caller and is_template = false.
//   * Creating in a foreign org is refused (RLS -> not_org_member).
//   * Direct inserts can't forge is_template = true or created_by != self.
//   * Only the creator can update/delete (fellow org member gets
//     not_found_or_not_creator and the row is untouched).
//   * Templates are immutable to everyone (0-row update).
//   * Fellow org members can read the custom row; outsiders cannot.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

import {
  createScenarioAction,
  deleteScenarioAction,
  updateScenarioAction,
} from '@/app/(authed)/app/scenarios/actions';

interface Fixture {
  creator: TestUser;
  member: TestUser;
  outsider: TestUser;
  org: TestOrg;
  outsiderOrg: TestOrg;
}

let fx: Fixture;

const draft = {
  stageType: 'individual_model',
  title: 'Our quarterly ritual',
  body: 'Model the ritual your team repeats every quarter.',
  durationMinutes: 15,
  tags: 'ritual, team',
};

beforeAll(async () => {
  const creator = await createTestUser();
  const member = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: creator.id });
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  const outsiderOrg = await createTestOrg({ ownerId: outsider.id });
  fx = { creator, member, outsider, org, outsiderOrg };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.creator.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('createScenarioAction', () => {
  test('org member creates a scenario in their own org', async () => {
    currentClient = await signInAs(fx.creator);
    const res = await createScenarioAction({ ...draft, orgId: fx.org.id });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const admin = getAdminClient();
    const row = await admin.from('scenarios').select('*').eq('id', res.id).single();
    expect(row.data?.created_by).toBe(fx.creator.id);
    expect(row.data?.org_id).toBe(fx.org.id);
    expect(row.data?.is_template).toBe(false);
    expect(row.data?.tags).toEqual(['ritual', 'team']);
  });

  test('creating in a foreign org is refused', async () => {
    currentClient = await signInAs(fx.creator);
    const res = await createScenarioAction({ ...draft, orgId: fx.outsiderOrg.id });
    expect(res).toEqual({ ok: false, code: 'not_org_member' });
  });

  test('invalid input is refused before touching the DB', async () => {
    currentClient = await signInAs(fx.creator);
    const res = await createScenarioAction({ ...draft, orgId: fx.org.id, title: '   ' });
    expect(res).toEqual({ ok: false, code: 'invalid_input' });
  });

  test('direct insert cannot forge is_template = true', async () => {
    const client = await signInAs(fx.creator);
    const res = await client.from('scenarios').insert({
      stage_type: 'individual_model',
      title: 'Forged template',
      body: 'Nope.',
      duration_minutes: 10,
      is_template: true,
      org_id: null,
      created_by: fx.creator.id,
    });
    expect(res.error).not.toBeNull();
  });

  test('direct insert cannot forge created_by as someone else', async () => {
    const client = await signInAs(fx.creator);
    const res = await client.from('scenarios').insert({
      stage_type: 'individual_model',
      title: 'Forged author',
      body: 'Nope.',
      duration_minutes: 10,
      is_template: false,
      org_id: fx.org.id,
      created_by: fx.member.id,
    });
    expect(res.error).not.toBeNull();
  });
});

describe('updateScenarioAction / deleteScenarioAction', () => {
  async function seedScenario(): Promise<string> {
    currentClient = await signInAs(fx.creator);
    const res = await createScenarioAction({ ...draft, orgId: fx.org.id });
    if (!res.ok) throw new Error(`seed create failed: ${res.code}`);
    return res.id;
  }

  test('creator updates their own scenario', async () => {
    const id = await seedScenario();
    currentClient = await signInAs(fx.creator);
    const res = await updateScenarioAction(id, {
      ...draft,
      orgId: fx.org.id,
      title: 'Renamed ritual',
      durationMinutes: 30,
    });
    expect(res.ok).toBe(true);

    const admin = getAdminClient();
    const row = await admin
      .from('scenarios')
      .select('title, duration_minutes')
      .eq('id', id)
      .single();
    expect(row.data?.title).toBe('Renamed ritual');
    expect(row.data?.duration_minutes).toBe(30);
  });

  test('fellow org member cannot update someone else’s scenario', async () => {
    const id = await seedScenario();
    currentClient = await signInAs(fx.member);
    const res = await updateScenarioAction(id, { ...draft, orgId: fx.org.id, title: 'Hijacked' });
    expect(res).toEqual({ ok: false, code: 'not_found_or_not_creator' });

    const admin = getAdminClient();
    const row = await admin.from('scenarios').select('title').eq('id', id).single();
    expect(row.data?.title).toBe(draft.title);
  });

  test('templates are immutable even to authenticated users', async () => {
    const admin = getAdminClient();
    const template = await admin
      .from('scenarios')
      .select('id, title')
      .eq('is_template', true)
      .limit(1)
      .single();
    expect(template.data).not.toBeNull();

    const client = await signInAs(fx.creator);
    const upd = await client
      .from('scenarios')
      .update({ title: 'Defaced template' })
      .eq('id', template.data!.id)
      .select('id');
    expect(upd.data).toEqual([]);

    const after = await admin
      .from('scenarios')
      .select('title')
      .eq('id', template.data!.id)
      .single();
    expect(after.data?.title).toBe(template.data!.title);
  });

  test('creator deletes their own scenario', async () => {
    const id = await seedScenario();
    currentClient = await signInAs(fx.creator);
    const res = await deleteScenarioAction(id);
    expect(res.ok).toBe(true);

    const admin = getAdminClient();
    const row = await admin.from('scenarios').select('id').eq('id', id).maybeSingle();
    expect(row.data).toBeNull();
  });

  test('fellow org member cannot delete someone else’s scenario', async () => {
    const id = await seedScenario();
    currentClient = await signInAs(fx.member);
    const res = await deleteScenarioAction(id);
    expect(res).toEqual({ ok: false, code: 'not_found_or_not_creator' });

    const admin = getAdminClient();
    const row = await admin.from('scenarios').select('id').eq('id', id).maybeSingle();
    expect(row.data).not.toBeNull();
  });
});

describe('read isolation', () => {
  test('fellow org member sees the custom row; outsider does not', async () => {
    currentClient = await signInAs(fx.creator);
    const created = await createScenarioAction({ ...draft, orgId: fx.org.id });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const memberClient = await signInAs(fx.member);
    const memberRead = await memberClient
      .from('scenarios')
      .select('id')
      .eq('id', created.id)
      .maybeSingle();
    expect(memberRead.data).not.toBeNull();

    const outsiderClient = await signInAs(fx.outsider);
    const outsiderRead = await outsiderClient
      .from('scenarios')
      .select('id')
      .eq('id', created.id)
      .maybeSingle();
    expect(outsiderRead.data).toBeNull();
  });
});
