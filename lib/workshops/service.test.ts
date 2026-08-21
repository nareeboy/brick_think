import { describe, expect, test } from 'vitest';

import { createWorkshop } from './service';

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
