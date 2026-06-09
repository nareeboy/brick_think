import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

const VALID = {
  name: 'Acme',
  display_name: 'Acme Consulting',
  brand_colour: '#1d4ed8',
  accent_colour: '#f59e0b',
  heading_font: { kind: 'curated', key: 'fraunces' },
  body_font: { kind: 'curated', key: 'geist' },
};

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

// Imported after the mocks (vi.mock is hoisted) so the action picks up the
// mocked db client. Mirrors facilitatorNotes.integration.test.ts.
import { createBrandProfileAction } from '@/app/(authed)/app/account/branding/actions';
import { MAX_BRAND_PROFILES_PER_OWNER } from '@/lib/branding/types';

// camelCase BrandInput shape the actions accept (distinct from the snake_case
// VALID row fixture used by the RLS tests above).
const VALID_INPUT = {
  name: 'Acme',
  displayName: 'Acme Consulting',
  footerContact: null,
  brandColour: '#1d4ed8',
  accentColour: '#f59e0b',
  headingFont: { kind: 'curated' as const, key: 'fraunces' },
  bodyFont: { kind: 'curated' as const, key: 'geist' },
};

describe('brand_profiles RLS', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeEach(async () => {
    alice = await createTestUser('alice-brand');
    bob = await createTestUser('bob-brand');
  });

  afterEach(async () => {
    await cleanupTestUser(alice.id);
    await cleanupTestUser(bob.id);
  });

  it('owner can insert + read their preset', async () => {
    const client = await signInAs(alice);
    const ins = await client
      .from('brand_profiles')
      .insert({ ...VALID, owner_id: alice.id })
      .select('id')
      .single();
    expect(ins.error).toBeNull();

    const read = await client.from('brand_profiles').select('id, display_name');
    expect(read.error).toBeNull();
    expect(read.data).toHaveLength(1);
    expect(read.data?.[0]?.display_name).toBe('Acme Consulting');
  });

  it('cannot insert a preset owned by another user', async () => {
    const client = await signInAs(alice);
    const ins = await client
      .from('brand_profiles')
      .insert({ ...VALID, owner_id: bob.id })
      .select('id')
      .single();
    expect(ins.error).not.toBeNull();
  });

  it("cannot read another user's preset", async () => {
    const aliceClient = await signInAs(alice);
    const seed = await aliceClient.from('brand_profiles').insert({ ...VALID, owner_id: alice.id });
    expect(seed.error).toBeNull();

    const bobClient = await signInAs(bob);
    const read = await bobClient.from('brand_profiles').select('id');
    expect(read.error).toBeNull();
    expect(read.data).toHaveLength(0);
  });

  it('rejects a non-hex brand_colour via the CHECK constraint', async () => {
    const client = await signInAs(alice);
    const ins = await client
      .from('brand_profiles')
      .insert({ ...VALID, owner_id: alice.id, brand_colour: 'blue' })
      .select('id')
      .single();
    expect(ins.error).not.toBeNull();
  });
});

describe('brand profile actions', () => {
  let alice: TestUser;

  beforeEach(async () => {
    alice = await createTestUser('alice-actions');
  });

  afterEach(async () => {
    currentClient = null;
    await cleanupTestUser(alice.id);
  });

  it('rejects an invalid brand colour with code invalid_colour', async () => {
    currentClient = await signInAs(alice);
    const res = await createBrandProfileAction({ ...VALID_INPUT, brandColour: 'blue' });
    expect(res).toEqual({ ok: false, code: 'invalid_colour' });

    // Nothing was written.
    const admin = getAdminClient();
    const rows = await admin.from('brand_profiles').select('id').eq('owner_id', alice.id);
    expect(rows.data).toHaveLength(0);
  });

  it('creates a preset for the signed-in owner and persists the row', async () => {
    currentClient = await signInAs(alice);
    const res = await createBrandProfileAction(VALID_INPUT);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok result');

    const admin = getAdminClient();
    const row = await admin
      .from('brand_profiles')
      .select('id, owner_id, name, display_name, brand_colour, accent_colour')
      .eq('id', res.id)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.owner_id).toBe(alice.id);
    expect(row.data?.display_name).toBe('Acme Consulting');
    expect(row.data?.brand_colour).toBe('#1d4ed8');
  });

  it('enforces the per-owner cap with code limit_reached', async () => {
    const admin = getAdminClient();
    const seed = Array.from({ length: MAX_BRAND_PROFILES_PER_OWNER }, (_, i) => ({
      ...VALID,
      owner_id: alice.id,
      name: `Preset ${i}`,
    }));
    const seedRes = await admin.from('brand_profiles').insert(seed).select('id');
    expect(seedRes.error).toBeNull();
    expect(seedRes.data).toHaveLength(MAX_BRAND_PROFILES_PER_OWNER);

    currentClient = await signInAs(alice);
    const res = await createBrandProfileAction(VALID_INPUT);
    expect(res).toEqual({ ok: false, code: 'limit_reached' });
  });
});
