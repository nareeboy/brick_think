import { describe, expect, it } from 'vitest';

import { computeDesignReadOnly } from './readOnly';

describe('computeDesignReadOnly', () => {
  describe('room-backed canvases', () => {
    it('facilitator is read-only on a room (orchestrates, does not build)', () => {
      // `can_edit_room` grants the facilitator an edit bypass, so isRoomMember
      // is true and liveMode would be true — but the facilitator must still
      // observe shared_model / system_model rooms read-only. Only their own
      // example model is editable.
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: true,
          liveMode: true,
          isOwner: true,
          isSessionFacilitator: true,
        }),
      ).toBe(true);
    });

    it('member (non-facilitator) edits the room', () => {
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: true,
          liveMode: true,
          isOwner: false,
          isSessionFacilitator: false,
        }),
      ).toBe(false);
    });

    it('non-member non-facilitator observer is read-only', () => {
      expect(
        computeDesignReadOnly({
          roomId: 'room-1',
          isRoomMember: false,
          liveMode: false,
          isOwner: false,
          isSessionFacilitator: false,
        }),
      ).toBe(true);
    });
  });

  describe('non-room canvases — legacy owner / live rule', () => {
    it('facilitator edits their own example model (individual_model they own)', () => {
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: false,
          isOwner: true,
          isSessionFacilitator: true,
        }),
      ).toBe(false);
    });

    it('owner of a personal canvas edits', () => {
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: false,
          isOwner: true,
          isSessionFacilitator: false,
        }),
      ).toBe(false);
    });

    it("facilitator viewing a participant's individual_model is read-only", () => {
      // The screenshot scenario: facilitator, non-owner, not live, no room.
      expect(
        computeDesignReadOnly({
          roomId: null,
          isRoomMember: null,
          liveMode: false,
          isOwner: false,
          isSessionFacilitator: true,
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
          isSessionFacilitator: false,
        }),
      ).toBe(false);
    });
  });
});
