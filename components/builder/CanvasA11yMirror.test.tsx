import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { CanvasA11yMirror, type MirrorBrick } from './CanvasA11yMirror';

afterEach(() => {
  cleanup();
});

const NOOP = {
  onFocusBrick: () => {},
  onSelectBrick: () => {},
  onMoveFocus: () => {},
  onDelete: () => {},
  onRotate: () => {},
  onCycleColor: () => {},
};

const BRICK_RED: MirrorBrick = {
  id: 'b1',
  name: 'Block red medium left',
  color: 'red',
  row: 5,
  col: 8,
};

describe('CanvasA11yMirror', () => {
  it('exposes a role="grid" container with row/col counts', () => {
    render(
      <CanvasA11yMirror
        bricks={[]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
      />,
    );
    const grid = screen.getByRole('grid', { name: /builder canvas/i });
    expect(grid.getAttribute('aria-rowcount')).toBe('20');
    expect(grid.getAttribute('aria-colcount')).toBe('20');
  });

  it('renders one gridcell per brick with accessible name', () => {
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
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
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId="b1"
        {...NOOP}
      />,
    );
    const cell = screen.getByRole('gridcell');
    expect(cell.getAttribute('aria-selected')).toBe('true');
  });

  it('omits color from the label when MirrorBrick.color is empty', () => {
    render(
      <CanvasA11yMirror
        bricks={[{ id: 'b1', name: 'Connector bracket', color: '', row: 3, col: 2 }]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
      />,
    );
    const cell = screen.getByRole('gridcell', {
      name: /^connector bracket, row 3 column 2$/i,
    });
    expect(cell.getAttribute('aria-rowindex')).toBe('3');
  });

  it('marks unselected bricks aria-selected="false"', () => {
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
      />,
    );
    expect(screen.getByRole('gridcell').getAttribute('aria-selected')).toBe('false');
  });

  it('emits onFocusBrick when a cell receives focus', () => {
    const onFocusBrick = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
        onFocusBrick={onFocusBrick}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    expect(onFocusBrick).toHaveBeenCalledWith('b1');
  });

  it('emits data-testid="placed-brick" + data-brick-id on each cell (e2e contract)', () => {
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
      />,
    );
    const cell = screen.getByTestId('placed-brick');
    expect(cell.getAttribute('data-brick-id')).toBe('b1');
  });

  it('emits onSelectBrick on Enter and Space', () => {
    const onSelectBrick = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
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

  it('emits onMoveFocus with the right direction for each arrow key', () => {
    const onMoveFocus = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
        onMoveFocus={onMoveFocus}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    for (const [key, dir] of [
      ['ArrowRight', 'right'],
      ['ArrowLeft', 'left'],
      ['ArrowDown', 'down'],
      ['ArrowUp', 'up'],
    ] as const) {
      cell.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(onMoveFocus).toHaveBeenCalledWith('b1', dir);
    }
    expect(onMoveFocus).toHaveBeenCalledTimes(4);
  });

  it('emits onDelete on Delete and Backspace', () => {
    const onDelete = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
        onDelete={onDelete}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    expect(onDelete).toHaveBeenCalledWith('b1');
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it('emits onRotate on r and R', () => {
    const onRotate = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
        onRotate={onRotate}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'R', bubbles: true }));
    expect(onRotate).toHaveBeenCalledWith('b1');
    expect(onRotate).toHaveBeenCalledTimes(2);
  });

  it('emits onCycleColor on c and C', () => {
    const onCycleColor = vi.fn();
    render(
      <CanvasA11yMirror
        bricks={[BRICK_RED]}
        rows={20}
        cols={20}
        focusedId={null}
        selectedId={null}
        {...NOOP}
        onCycleColor={onCycleColor}
      />,
    );
    const cell = screen.getByRole('gridcell');
    cell.focus();
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
    expect(onCycleColor).toHaveBeenCalledWith('b1');
    expect(onCycleColor).toHaveBeenCalledTimes(2);
  });
});
