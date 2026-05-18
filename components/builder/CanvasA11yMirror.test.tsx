import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CanvasA11yMirror } from './CanvasA11yMirror';

afterEach(() => {
  cleanup();
});

describe('CanvasA11yMirror', () => {
  it('exposes a role="grid" container with row/col counts', () => {
    render(
      <CanvasA11yMirror
        bricks={[]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        onFocusBrick={() => {}}
        onSelectBrick={() => {}}
      />,
    );
    const grid = screen.getByRole('grid', { name: /builder canvas/i });
    expect(grid.getAttribute('aria-rowcount')).toBe('20');
    expect(grid.getAttribute('aria-colcount')).toBe('20');
  });

  it('renders one gridcell per brick with accessible name', () => {
    render(
      <CanvasA11yMirror
        bricks={[
          { id: 'b1', name: 'Block red medium left', color: 'red', row: 5, col: 8 },
        ]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        onFocusBrick={() => {}}
        onSelectBrick={() => {}}
      />,
    );
    const cell = screen.getByRole('gridcell', {
      name: /^block red medium left, red, row 5 column 8$/i,
    });
    expect(cell.getAttribute('tabindex')).toBe('0');
    expect(cell.getAttribute('aria-rowindex')).toBe('5');
    expect(cell.getAttribute('aria-colindex')).toBe('8');
  });

  it('marks the selected brick aria-selected', () => {
    render(
      <CanvasA11yMirror
        bricks={[{ id: 'b1', name: 'Block red medium left', color: 'red', row: 5, col: 8 }]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId="b1"
        onFocusBrick={() => {}}
        onSelectBrick={() => {}}
      />,
    );
    const cell = screen.getByRole('gridcell');
    expect(cell.getAttribute('aria-selected')).toBe('true');
  });

  it('marks unselected bricks aria-selected="false"', () => {
    render(
      <CanvasA11yMirror
        bricks={[{ id: 'b1', name: 'Block red medium left', color: 'red', row: 5, col: 8 }]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        onFocusBrick={() => {}}
        onSelectBrick={() => {}}
      />,
    );
    expect(screen.getByRole('gridcell').getAttribute('aria-selected')).toBe('false');
  });

  it('emits onFocusBrick when a cell receives focus', () => {
    const onFocusBrick = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[{ id: 'b1', name: 'Block red medium left', color: 'red', row: 5, col: 8 }]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        onFocusBrick={onFocusBrick}
        onSelectBrick={() => {}}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    expect(onFocusBrick).toHaveBeenCalledWith('b1');
  });

  it('emits onSelectBrick on Enter and Space', () => {
    const onSelectBrick = vi.fn();
    const { rerender: _rerender } = render(
      <CanvasA11yMirror
        bricks={[{ id: 'b1', name: 'Block red medium left', color: 'red', row: 5, col: 8 }]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        onFocusBrick={() => {}}
        onSelectBrick={onSelectBrick}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelectBrick).toHaveBeenCalledWith('b1');
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onSelectBrick).toHaveBeenCalledTimes(2);
  });
});
