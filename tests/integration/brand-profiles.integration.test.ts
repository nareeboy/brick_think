import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
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
