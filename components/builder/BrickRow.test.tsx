import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { BrickRow } from './LayersPanel';
import type { BrickInstance } from './builderState';

afterEach(cleanup);

function brick(overrides: Partial<BrickInstance> = {}): BrickInstance {
  return {
    id: 'aaaa-2525',
    groupId: 'g1',
    code: 'C1',
    image: 'x.png',
    width: 80,
    height: 32,
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
    ...overrides,
  };
}

function renderRow(extra: Partial<Parameters<typeof BrickRow>[0]> = {}) {
  const onRename = vi.fn();
  render(
    <BrickRow
      brick={brick()}
      selected={false}
      groupHidden={false}
      hint={null}
      onSelect={vi.fn()}
      onToggleVisible={vi.fn()}
      onDelete={vi.fn()}
      onRename={onRename}
      onDragStart={vi.fn()}
      onDragOver={vi.fn()}
      onDrop={vi.fn()}
      {...extra}
    />,
  );
  return { onRename };
}

describe('BrickRow rename', () => {
  test('double-click opens an input and Enter commits the new name', () => {
    const { onRename } = renderRow();
    fireEvent.doubleClick(screen.getByText(/C1 · 2525/));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Roof tile' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRename).toHaveBeenCalledWith('aaaa-2525', 'Roof tile');
  });

  test('Escape cancels without calling onRename', () => {
    const { onRename } = renderRow();
    fireEvent.doubleClick(screen.getByText(/C1 · 2525/));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Nope' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onRename).not.toHaveBeenCalled();
    // input is gone and the generated label is shown again (getByText throws if absent)
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText(/C1 · 2525/)).toBeTruthy();
  });
});

describe('BrickRow selection', () => {
  test('plain click selects without the shift flag', () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: /C1 · 2525/ }));
    expect(onSelect).toHaveBeenCalledWith('aaaa-2525', false);
  });

  test('shift-click passes the shift flag for multi-select toggling', () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });
    fireEvent.click(screen.getByRole('button', { name: /C1 · 2525/ }), { shiftKey: true });
    expect(onSelect).toHaveBeenCalledWith('aaaa-2525', true);
  });

  test('Shift+Enter on a focused row passes the shift flag', () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });
    fireEvent.keyDown(screen.getByRole('button', { name: /C1 · 2525/ }), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(onSelect).toHaveBeenCalledWith('aaaa-2525', true);
  });
});
