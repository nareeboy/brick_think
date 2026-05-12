import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
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
