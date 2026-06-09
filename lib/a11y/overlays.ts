/**
 * Resolves whether pattern overlays render for a viewer on a brick canvas, and
 * whether the in-canvas opt-out toggle should be shown.
 *
 * Two independent inputs decide the default:
 * - `sessionForced` — the facilitator flipped the session-wide switch in the
 *   pre-session checklist (`sessions.pre_session_check.colourblind_mode`).
 * - `personalPref` — the viewer's own `/app/account` default.
 *
 * When the facilitator forced overlays on, the viewer's per-canvas toggle
 * (`useBrickOverlays`, default on) governs and the toggle button is shown so
 * the opt-out is always reversible. Otherwise overlays follow the viewer's
 * personal preference and there is no in-canvas toggle.
 */
export function resolveBrickOverlays({
  sessionForced,
  personalPref,
  viewerToggle,
}: {
  sessionForced: boolean;
  personalPref: boolean;
  viewerToggle: boolean;
}): { overlaysOn: boolean; showToggle: boolean } {
  if (sessionForced) {
    return { overlaysOn: viewerToggle, showToggle: true };
  }
  return { overlaysOn: personalPref, showToggle: false };
}
