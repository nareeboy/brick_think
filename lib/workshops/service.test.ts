import { describe, expect, test } from 'vitest';

import { createWorkshop, renameWorkshop } from './service';
import type { ServerSupabaseClient } from '@/lib/db/server';

function unusedClient(): ServerSupabaseClient {
  return new Proxy({} as ServerSupabaseClient, {
    get() {
      throw new Error('service must validate before touching the database');
    },
  });
}

const OWNER = '11111111-1111-4111-8111-111111111111';

describe('createWorkshop', () => {
  test('rejects an empty name', async () => {
    const result = await createWorkshop({ name: '  ', slug: 'valid-slug', ownerId: OWNER });
    expect(result).toEqual({ ok: false, code: 'invalid_input', field: 'name' });
  });

  test('rejects a name over 80 characters', async () => {
    const result = await createWorkshop({
      name: 'x'.repeat(81),
      slug: 'valid-slug',
      ownerId: OWNER,
    });
    expect(result).toEqual({ ok: false, code: 'invalid_input', field: 'name' });
  });

  test('rejects an invalid slug', async () => {
    const result = await createWorkshop({
      name: 'Product Sprint',
      slug: 'Not A Slug',
      ownerId: OWNER,
    });
    expect(result).toEqual({ ok: false, code: 'invalid_input', field: 'slug' });
  });
});

describe('renameWorkshop', () => {
  test('rejects a blank name', async () => {
    const result = await renameWorkshop({
      supabase: unusedClient(),
      orgId: '22222222-2222-4222-8222-222222222222',
      name: '   ',
    });
    expect(result).toEqual({ ok: false, code: 'invalid_input' });
  });

  test('rejects a name over 80 characters', async () => {
    const result = await renameWorkshop({
      supabase: unusedClient(),
      orgId: '22222222-2222-4222-8222-222222222222',
      name: 'x'.repeat(81),
    });
    expect(result).toEqual({ ok: false, code: 'invalid_input' });
  });

  test('reports forbidden when Postgres raises 42501', async () => {
    // Partial mock: the service only touches the organisations update chain;
    // the full ServerSupabaseClient surface is irrelevant here.
    // eslint-disable-next-line no-restricted-syntax
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: async () => ({ data: null, error: { code: '42501', message: 'denied' } }),
          }),
        }),
      }),
    } as unknown as ServerSupabaseClient;

    const result = await renameWorkshop({
      supabase,
      orgId: '22222222-2222-4222-8222-222222222222',
      name: 'Renamed',
    });
    expect(result).toEqual({ ok: false, code: 'forbidden' });
  });
});
