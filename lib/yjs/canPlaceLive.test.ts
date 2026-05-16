import { describe, expect, test } from 'vitest';

import { canPlaceLive } from './canPlaceLive';

describe('canPlaceLive', () => {
  test('true on shared_model + flag on', () => {
    expect(
      canPlaceLive({
        sessionContext: {
          sessionId: 's1',
          sessionTitle: 't',
          stageType: 'shared_model',
        },
        flagEnabled: true,
      }),
    ).toBe(true);
  });

  test('false when flag off', () => {
    expect(
      canPlaceLive({
        sessionContext: {
          sessionId: 's1',
          sessionTitle: 't',
          stageType: 'shared_model',
        },
        flagEnabled: false,
      }),
    ).toBe(false);
  });

  test('false on non-shared stage', () => {
    expect(
      canPlaceLive({
        sessionContext: {
          sessionId: 's1',
          sessionTitle: 't',
          stageType: 'individual_model',
        },
        flagEnabled: true,
      }),
    ).toBe(false);
  });

  test('false when no session context', () => {
    expect(canPlaceLive({ sessionContext: null, flagEnabled: true })).toBe(false);
  });
});
