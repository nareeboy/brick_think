/**
 * Move keyboard focus between role="button" tabindex="0" rows inside the
 * nearest [data-testid="layers-panel"] ancestor (or <section> fallback).
 *
 * Used by LayersPanel group headers and brick rows to implement
 * ArrowUp / ArrowDown navigation (WCAG 2.1.1).
 */
export function moveRowFocus(current: HTMLElement, dir: 'up' | 'down'): void {
  const panel =
    current.closest<HTMLElement>('[data-testid="layers-panel"]') ??
    current.closest<HTMLElement>('section');
  if (!panel) return;

  const rows = Array.from(
    panel.querySelectorAll<HTMLElement>('[role="button"][tabindex="0"]'),
  );
  const idx = rows.indexOf(current);
  if (idx === -1) return;

  const next = dir === 'down' ? rows[idx + 1] : rows[idx - 1];
  next?.focus();
}
