import { describe, expect, it } from 'vitest';

import { canSaveModelVersion } from './canSaveModelVersion';

describe('canSaveModelVersion', () => {
  describe('room-backed canvas — owner-only at the RLS layer', () => {
    it('hides for an attendee (member, not facilitator) — the reported 500', () => {
      // Attendees can edit the room live but do not own the models row, so the
      // model_versions insert is rejected by RLS and the API 500s. Hide it.
      expect(
        canSaveModelVersion({ roomBacked: true, isSessionFacilitator: false }),
      ).toBe(false);
    });

    it('shows for the facilitator (the owner of the room model)', () => {
      expect(
        canSaveModelVersion({ roomBacked: true, isSessionFacilitator: true }),
      ).toBe(true);
    });
  });

  describe('non-room canvas — owned by the caller', () => {
    it('shows on a non-room session canvas (individual_model / skill_building)', () => {
      expect(
        canSaveModelVersion({ roomBacked: false, isSessionFacilitator: false }),
      ).toBe(true);
    });

    it('shows on a personal design', () => {
      expect(
        canSaveModelVersion({ roomBacked: false, isSessionFacilitator: false }),
      ).toBe(true);
    });
  });
});
