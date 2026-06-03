import { describe, expect, it } from 'vitest';

import { computeDesignReadOnly } from './readOnly';

describe('computeDesignReadOnly', () => {
  describe('room-backed canvases — gate on membership, not ownership', () => {
    it('facilitator who OWNS the room but is NOT a member is read-only', () => {
      // The reported shared_model bug: facilitator owns the models row
      // (isOwner=true) yet must not be able to move pieces because they are
      // not a room member.
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: false,
          liveMode: false,
          isOwner: true,
        }),
      ).toBe(true);
    });

    it('member of the room edits (not read-only), even when not the owner', () => {
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: true,
          liveMode: true,
          isOwner: false,
        }),
      ).toBe(false);
    });

    it('member who also owns the room edits', () => {
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: true,
          liveMode: true,
          isOwner: true,
        }),
      ).toBe(false);
    });

    it('non-member non-owner observer is read-only', () => {
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: false,
          liveMode: false,
          isOwner: false,
        }),
      ).toBe(true);
    });
  });

  describe('non-room canvases — legacy owner / live rule', () => {
    it('owner of a personal canvas edits', () => {
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: false,
          isOwner: true,
        }),
      ).toBe(false);
    });

    it("facilitator viewing a participant's individual_model is read-only", () => {
      // The screenshot scenario: non-owner, not live, no room.
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: false,
          isOwner: false,
        }),
      ).toBe(true);
    });

    it('legacy shared_model live co-editor (non-owner) edits', () => {
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: true,
          isOwner: false,
        }),
      ).toBe(false);
    });
  });
});
