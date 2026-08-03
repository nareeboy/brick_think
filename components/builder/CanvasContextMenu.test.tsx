import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { CanvasContextMenu } from './CanvasContextMenu';

import type { ReorderDirection } from '@/lib/canvas/reorder';

afterEach(cleanup);

function renderMenu(extra: Partial<Parameters<typeof CanvasContextMenu>[0]> = {}) {
  const onFlipHorizontal = vi.fn();
  const onReorder = vi.fn();
  const onClose = vi.fn();
  render(
    <CanvasContextMenu
      left={40}
      top={40}
      targetCount={1}
      disabledDirections={new Set<ReorderDirection>()}
      onFlipHorizontal={onFlipHorizontal}
      onReorder={onReorder}
      onClose={onClose}
      {...extra}
    />,
  );
  return { onFlipHorizontal, onReorder, onClose };
}

describe('CanvasContextMenu', () => {
  test('renders all five actions as menu items', () => {
    renderMenu();
    expect(screen.getByRole('menu')).toBeTruthy();
    for (const label of [
      'Flip horizontal',
      'Bring to front',
      'Bring forward',
      'Send backward',
      'Send to back',
    ]) {
      expect(screen.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  test('flip fires the callback then closes', () => {
    const { onFlipHorizontal, onClose } = renderMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Flip horizontal' }));
    expect(onFlipHorizontal).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('reorder items fire with their direction then close', () => {
    const { onReorder, onClose } = renderMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Send to back' }));
    expect(onReorder).toHaveBeenCalledWith('back');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('disabled directions render disabled and do not fire', () => {
    const { onReorder } = renderMenu({
      disabledDirections: new Set<ReorderDirection>(['front', 'forward']),
    });
    const item = screen.getByRole('menuitem', { name: 'Bring forward' }) as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    fireEvent.click(item);
    expect(onReorder).not.toHaveBeenCalled();
  });

  test('multi-selection count lands in the flip label', () => {
    renderMenu({ targetCount: 3 });
    expect(screen.getByRole('menuitem', { name: 'Flip horizontal (3 pieces)' })).toBeTruthy();
  });

  test('Escape closes the menu', () => {
    const { onClose } = renderMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('pointerdown outside closes; inside does not', () => {
    const { onClose } = renderMenu();
    fireEvent.pointerDown(screen.getByRole('menu'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('focuses the first enabled item on open', () => {
    renderMenu({ disabledDirections: new Set<ReorderDirection>() });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Flip horizontal' }));
  });

  test('arrow keys cycle focus through enabled items', () => {
    renderMenu({ disabledDirections: new Set<ReorderDirection>(['front']) });
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    // 'Bring to front' is disabled, so ArrowDown from Flip lands on Bring forward.
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Bring forward' }));
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Flip horizontal' }));
  });
});
