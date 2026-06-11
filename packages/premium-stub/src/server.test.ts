import { describe, expect, it } from 'vitest';

import { cleanupNarration } from './server';

describe('stub cleanupNarration', () => {
  it('passes the raw transcript through unchanged and marks it skipped', async () => {
    const outcome = await cleanupNarration('um so we built a thing', { facilitatorId: 'f1' });
    expect(outcome).toEqual({
      text: 'um so we built a thing',
      cleaned: false,
      status: 'skipped',
    });
  });
});
