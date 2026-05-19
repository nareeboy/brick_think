import { describe, expect, test } from 'vitest';

import { canPlaceLive } from './canPlaceLive';

const SHARED_CTX = {
  sessionId: 's1',
  sessionTitle: 't',
  stageType: 'shared_model' as const,
};

describe('canPlaceLive', () => {
  test('true on shared_model + flag on + legacy (no room)', () => {
    expect(
      canPlaceLive({ sessionContext: SHARED_CTX, flagEnabled: true, isRoomMember: null }),
    ).toBe(true);
  });

  test('false when flag off', () => {
    expect(
      canPlaceLive({ sessionContext: SHARED_CTX, flagEnabled: false, isRoomMember: null }),
    ).toBe(false);
  });

  test('false on non-shared stage', () => {
    expect(
      canPlaceLive({
        sessionContext: { sessionId: 's1', sessionTitle: 't', stageType: 'individual_model' },
        flagEnabled: true,
        isRoomMember: null,
      }),
    ).toBe(false);
  });

  test('false when no session context', () => {
    expect(canPlaceLive({ sessionContext: null, flagEnabled: true, isRoomMember: null })).toBe(
      false,
    );
  });

  test('room-backed: true when caller is a member', () => {
    expect(
      canPlaceLive({ sessionContext: SHARED_CTX, flagEnabled: true, isRoomMember: true }),
    ).toBe(true);
  });

  test('room-backed: false when caller is not a member', () => {
    expect(
      canPlaceLive({ sessionContext: SHARED_CTX, flagEnabled: true, isRoomMember: false }),
    ).toBe(false);
  });
});
