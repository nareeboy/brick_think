import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BrickDefinition } from '@/lib/bricks/types';

// Static import for the type used inside vi.mock factory — avoids the
// `import()` type annotation that @typescript-eslint/consistent-type-imports
// forbids inside mock factories.
import type * as BuilderStateModule from './builderState';

import { CANVAS_DROP_TARGET, DragPieceProvider, useDragPiece } from './dragPiece';

// ---------------------------------------------------------------------------
// Mock useBuilderState so we don't need a full Supabase / Yjs stack.
// ---------------------------------------------------------------------------

const mockAddBrick = vi.fn();
const mockView = { pan: { x: 0, y: 0 }, zoom: 1 };
const mockActiveGroupId = 'g1';

vi.mock('./builderState', async (importOriginal) => {
  const actual = await importOriginal<typeof BuilderStateModule>();
  return {
    ...actual,
    useBuilderState: () => ({
      addBrick: mockAddBrick,
      view: mockView,
      activeGroupId: mockActiveGroupId,
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_BRICK: BrickDefinition = {
  code: 'brick-2x4-red',
  name: '2x4 Brick Red',
  category: 'brick',
  width: 80,
  height: 32,
  image: '/bricks/brick-2x4-red.png',
};

/** Renders DragPieceProvider with a fake canvas drop-target in the DOM. */
function renderWithProvider(
  Child: () => React.ReactElement,
  wrapperOptions?: { canvasWidth?: number; canvasHeight?: number },
) {
  const { canvasWidth = 800, canvasHeight = 600 } = wrapperOptions ?? {};

  // Attach a fake canvas drop-target so addAtCenter can find it.
  const canvasTarget = document.createElement('div');
  canvasTarget.setAttribute('data-drop-target', CANVAS_DROP_TARGET);
  canvasTarget.getBoundingClientRect = () =>
    ({
      width: canvasWidth,
      height: canvasHeight,
      x: 0,
      y: 0,
      top: 0,
      right: canvasWidth,
      bottom: canvasHeight,
      left: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(canvasTarget);

  const result = render(
    <DragPieceProvider>
      <Child />
    </DragPieceProvider>,
  );

  return {
    ...result,
    removeTarget: () => {
      document.body.removeChild(canvasTarget);
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DragPieceProvider / addAtCenter', () => {
  it('exposes addAtCenter via useDragPiece()', () => {
    let ctx: ReturnType<typeof useDragPiece> | undefined;

    function Probe(): React.ReactElement {
      ctx = useDragPiece();
      return <div />;
    }

    const { removeTarget } = renderWithProvider(Probe);
    expect(typeof ctx!.addAtCenter).toBe('function');
    removeTarget();
  });

  it('calls addBrick with the correct code, image, and groupId when addAtCenter is invoked', () => {
    let ctx: ReturnType<typeof useDragPiece> | undefined;

    function Probe(): React.ReactElement {
      ctx = useDragPiece();
      return <div />;
    }

    const { removeTarget } = renderWithProvider(Probe);

    act(() => {
      ctx!.addAtCenter(SAMPLE_BRICK);
    });

    expect(mockAddBrick).toHaveBeenCalledTimes(1);
    const instance = mockAddBrick.mock.calls[0]?.[0] as unknown as {
      id: string;
      code: string;
      image: string;
      groupId: string;
      rotation: number;
      visible: boolean;
    };
    expect(instance.code).toBe(SAMPLE_BRICK.code);
    expect(instance.image).toBe(SAMPLE_BRICK.image);
    expect(instance.groupId).toBe(mockActiveGroupId);
    expect(instance.rotation).toBe(0);
    expect(instance.visible).toBe(true);
    expect(typeof instance.id).toBe('string');

    removeTarget();
  });

  it('places the brick at canvas centre coordinates (pan=0, zoom=1)', () => {
    let ctx: ReturnType<typeof useDragPiece> | undefined;

    function Probe(): React.ReactElement {
      ctx = useDragPiece();
      return <div />;
    }

    // canvas 800×600, pan {0,0}, zoom 1 → expected centre: x=400, y=300
    const { removeTarget } = renderWithProvider(Probe, { canvasWidth: 800, canvasHeight: 600 });

    act(() => {
      ctx!.addAtCenter(SAMPLE_BRICK);
    });

    const instance = mockAddBrick.mock.calls[0]?.[0] as unknown as { x: number; y: number };
    expect(instance.x).toBe(400); // (800/2 - 0) / 1
    expect(instance.y).toBe(300); // (600/2 - 0) / 1

    removeTarget();
  });

  it('does nothing when no canvas drop-target element exists', () => {
    // Render WITHOUT adding a canvas target to the DOM.
    let ctx: ReturnType<typeof useDragPiece> | undefined;

    function Probe(): React.ReactElement {
      ctx = useDragPiece();
      return <div />;
    }

    render(
      <DragPieceProvider>
        <Probe />
      </DragPieceProvider>,
    );

    act(() => {
      ctx!.addAtCenter(SAMPLE_BRICK);
    });

    expect(mockAddBrick).not.toHaveBeenCalled();
  });

  it('throws when useDragPiece is used outside DragPieceProvider', () => {
    function Rogue(): React.ReactElement {
      useDragPiece();
      return <div />;
    }

    // Suppress the React error boundary output.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Rogue />)).toThrow('useDragPiece must be used inside <DragPieceProvider>');
    errorSpy.mockRestore();
  });
});
