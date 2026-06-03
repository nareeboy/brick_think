import { describe, expect, test } from 'vitest';

import { canPlaceLive } from './canPlaceLive';

const SHARED_CTX = {
  sessionId: 's1',
  sessionTitle: 't',
  stageType: 'shared_model' as const,
};

const SYSTEM_CTX = {
  sessionId: 's1',
  sessionTitle: 't',
  stageType: 'system_model' as const,
};

const GUIDING_CTX = {
  sessionId: 's1',
  sessionTitle: 't',
  stageType: 'guiding_principles' as const,
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

  // Downstream room composition (system_model / guiding_principles): a member
  // of the sourced upstream room is a transitive room member and must be able
  // to co-edit the composed canvas live. Membership is resolved server-side via
  // can_edit_room and arrives here as isRoomMember.
  test('system_model room-backed: true when caller is a transitive member', () => {
    expect(
      canPlaceLive({ sessionContext: SYSTEM_CTX, flagEnabled: true, isRoomMember: true }),
    ).toBe(true);
  });

  test('system_model room-backed: false when caller is not a member', () => {
    expect(
      canPlaceLive({ sessionContext: SYSTEM_CTX, flagEnabled: true, isRoomMember: false }),
    ).toBe(false);
  });

  test('guiding_principles room-backed: true when caller is a transitive member', () => {
    expect(
      canPlaceLive({ sessionContext: GUIDING_CTX, flagEnabled: true, isRoomMember: true }),
    ).toBe(true);
  });

  // Legacy downstream personal canvases (no room) stay autosave-backed — they
  // are one-per-participant, never collaborative.
  test('system_model non-room (legacy personal canvas): false', () => {
    expect(
      canPlaceLive({ sessionContext: SYSTEM_CTX, flagEnabled: true, isRoomMember: null }),
    ).toBe(false);
  });
});
