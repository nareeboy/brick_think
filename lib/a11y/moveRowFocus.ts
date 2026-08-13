/**
 * Move keyboard focus between [data-layer-row] row buttons inside the
 * nearest [data-testid="layers-panel"] ancestor (or <section> fallback).
 *
 * Used by LayersPanel group headers and brick rows to implement
 * ArrowUp / ArrowDown navigation (WCAG 2.1.1). The marker attribute keeps
 * the query from matching the rows' sibling icon buttons (collapse /
 * hide / delete).
 */
export function moveRowFocus(current: HTMLElement, dir: 'up' | 'down'): void {
  const panel =
    current.closest<HTMLElement>('[data-testid="layers-panel"]') ??
    current.closest<HTMLElement>('section');
  if (!panel) return;

  const rows = Array.from(panel.querySelectorAll<HTMLElement>('[data-layer-row]'));
  const idx = rows.indexOf(current);
  if (idx === -1) return;

  const next = dir === 'down' ? rows[idx + 1] : rows[idx - 1];
  next?.focus();
}
