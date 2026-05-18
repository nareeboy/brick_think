import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

afterEach(cleanup);
afterEach(() => {
  vi.unstubAllGlobals();
});

vi.mock('@/components/canvas/BrickImage', () => ({
  BrickImage: ({ brick }: { brick: { id: string } }) => (
    <div data-testid="brick-image" data-brick-id={brick.id} />
  ),
  useBrickImage: () => null,
}));

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>,
}));

import { ShareCanvas } from './ShareCanvas';

describe('<ShareCanvas>', () => {
  beforeEach(() => {
    // happy-dom doesn't fire ResizeObserver, so the size-gated render never
    // mounts. Provide a synchronous, deterministic stub.
    class StubResizeObserver {
      constructor(_cb: ResizeObserverCallback) {}
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', StubResizeObserver);

    // The component reads getBoundingClientRect() at mount.
    // Force a non-zero rect so the size-gated branch renders.
    Element.prototype.getBoundingClientRect = function () {
      return {
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        toJSON: () => ({}),
      } as DOMRect;
    };
  });

  const visibleGroup = { id: 'g1', name: 'g', collapsed: false, visible: true };
  const hiddenGroup = { id: 'g2', name: 'h', collapsed: false, visible: false };
  const brickA = {
    id: 'a',
    groupId: 'g1',
    code: 'x',
    image: '/x.png',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    visible: true,
  };
  const brickB = {
    id: 'b',
    groupId: 'g2',
    code: 'x',
    image: '/x.png',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    visible: true,
  };
  const brickC = {
    id: 'c',
    groupId: 'g1',
    code: 'x',
    image: '/x.png',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    visible: false,
  };

  it('renders only visible bricks in visible groups', () => {
    render(
      <ShareCanvas
        groups={[visibleGroup, hiddenGroup]}
        bricks={[brickA, brickB, brickC]}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        onZoomBy={() => {}}
        onPanBy={() => {}}
      />,
    );
    const rendered = screen.getAllByTestId('brick-image');
    expect(rendered.map((n) => n.getAttribute('data-brick-id'))).toEqual(['a']);
  });

  it('renders the `data-testid="placed-brick"` sr-only list for E2E parity with the authed builder', () => {
    render(
      <ShareCanvas
        groups={[visibleGroup]}
        bricks={[brickA]}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        onZoomBy={() => {}}
        onPanBy={() => {}}
      />,
    );
    expect(screen.getAllByTestId('placed-brick')).toHaveLength(1);
  });

  it('calls onPanBy with pointer deltas during a drag', () => {
    const onPanBy = vi.fn();
    render(
      <ShareCanvas
        groups={[visibleGroup]}
        bricks={[brickA]}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        onZoomBy={() => {}}
        onPanBy={onPanBy}
      />,
    );

    const surface = screen.getByTestId('share-canvas-surface');

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    expect(onPanBy).not.toHaveBeenCalled();

    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 150, clientY: 120 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 160, clientY: 110 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 160, clientY: 110 });

    expect(onPanBy).toHaveBeenCalledTimes(2);
    expect(onPanBy).toHaveBeenNthCalledWith(1, 50, 20);
    expect(onPanBy).toHaveBeenNthCalledWith(2, 10, -10);

    // After release, further pointermoves must not call onPanBy.
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 200, clientY: 200 });
    expect(onPanBy).toHaveBeenCalledTimes(2);
  });

  it('does not start a drag when pointerdown originates inside the zoom HUD', () => {
    const onPanBy = vi.fn();
    render(
      <ShareCanvas
        groups={[visibleGroup]}
        bricks={[brickA]}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        onZoomBy={() => {}}
        onPanBy={onPanBy}
      />,
    );

    const zoomIn = screen.getByLabelText('Zoom in');
    fireEvent.pointerDown(zoomIn, { pointerId: 1, clientX: 700, clientY: 580, button: 0 });
    fireEvent.pointerMove(zoomIn, { pointerId: 1, clientX: 720, clientY: 590 });
    fireEvent.pointerUp(zoomIn, { pointerId: 1, clientX: 720, clientY: 590 });

    expect(onPanBy).not.toHaveBeenCalled();
  });
});
