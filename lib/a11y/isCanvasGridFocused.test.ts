// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isCanvasGridFocused } from './isCanvasGridFocused';

describe('isCanvasGridFocused', () => {
  let grid: HTMLDivElement;
  let cell: HTMLDivElement;
  let outsideButton: HTMLButtonElement;

  beforeEach(() => {
    // Build a minimal DOM that mirrors the CanvasA11yMirror structure.
    grid = document.createElement('div');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Builder canvas');

    cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '0');
    grid.appendChild(cell);

    outsideButton = document.createElement('button');

    document.body.appendChild(grid);
    document.body.appendChild(outsideButton);
  });

  afterEach(() => {
    grid.remove();
    outsideButton.remove();
  });

  it('returns false when no element is focused', () => {
    // Ensure nothing is focused.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    expect(isCanvasGridFocused()).toBe(false);
  });

  it('returns true when a gridcell inside the builder canvas grid is focused', () => {
    cell.focus();
    expect(isCanvasGridFocused()).toBe(true);
  });

  it('returns true when the grid itself is focused', () => {
    grid.setAttribute('tabindex', '0');
    grid.focus();
    expect(isCanvasGridFocused()).toBe(true);
  });

  it('returns false when an element outside the canvas grid is focused', () => {
    outsideButton.focus();
    expect(isCanvasGridFocused()).toBe(false);
  });
});
