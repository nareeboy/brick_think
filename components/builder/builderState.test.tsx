import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { BuilderProvider, useBuilderState } from './builderState';

function wrap(initial?: Parameters<typeof BuilderProvider>[0]['initial']) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <BuilderProvider initial={initial}>{children}</BuilderProvider>;
  };
}

describe('BuilderProvider initial state', () => {
  it('uses default empty group when no initial supplied', () => {
    const { result } = renderHook(() => useBuilderState(), { wrapper: wrap() });
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.bricks).toEqual([]);
  });

  it('hydrates from initial.canvasState', () => {
    const initial = {
      modelId: 'm1',
      title: 'Greenhouse',
      canvasState: {
        groups: [{ id: 'g1', name: 'Roof', collapsed: false, visible: true }],
        bricks: [
          {
            id: 'b1', groupId: 'g1', code: 'A', image: '',
            width: 50, height: 50, x: 10, y: 20, rotation: 0, visible: true,
          },
        ],
      },
    };
    const { result } = renderHook(() => useBuilderState(), { wrapper: wrap(initial) });
    expect(result.current.title).toBe('Greenhouse');
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]?.name).toBe('Roof');
    expect(result.current.bricks).toHaveLength(1);
    expect(result.current.bricks[0]?.x).toBe(10);
  });
});

describe('BuilderProvider readOnly', () => {
  it('readOnly provider blocks mutations and reports readOnly via context', () => {
    const initial = {
      modelId: 'm1',
      title: 'Locked',
      canvasState: {
        groups: [{ id: 'g1', name: 'Roof', collapsed: false, visible: true }],
        bricks: [],
      },
    };
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <BuilderProvider initial={initial} readOnly>{children}</BuilderProvider>
    );
    const { result } = renderHook(() => useBuilderState(), { wrapper: Wrapper });

    expect(result.current.readOnly).toBe(true);
    const beforeBricks = result.current.bricks.length;
    act(() => {
      result.current.addBrick({
        id: 'b1', groupId: 'g1', code: 'A', image: '',
        width: 50, height: 50, x: 0, y: 0, rotation: 0, visible: true,
      });
    });
    expect(result.current.bricks).toHaveLength(beforeBricks);
    act(() => {
      result.current.setTitle('Hijack');
    });
    expect(result.current.title).toBe('Locked');
  });
});
