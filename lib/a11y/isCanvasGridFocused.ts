/**
 * Returns true when keyboard focus is currently inside the builder canvas
 * accessibility grid. Used by window-level keydown listeners to defer to the
 * grid cell's own React handler when a gridcell has focus.
 */
export function isCanvasGridFocused(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.activeElement?.closest('[role="grid"][aria-label="Builder canvas"]'),
  );
}
