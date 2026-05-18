import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';

// ---------------------------------------------------------------------------
// Mock useDragPiece so PiecesDrawer tests are isolated from DragPieceProvider.
// ---------------------------------------------------------------------------

const mockAddAtCenter = vi.fn();
const mockStartDrag = vi.fn();

vi.mock('./dragPiece', () => ({
  useDragPiece: () => ({
    addAtCenter: mockAddAtCenter,
    startDrag: mockStartDrag,
    active: false,
  }),
  // PiecesDrawer doesn't use DragPieceProvider directly, but the module
  // re-export is included for completeness.
  DragPieceProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CANVAS_DROP_TARGET: 'canvas',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Use the first canonical brick as a stable test subject.
const FIRST_BRICK = CANONICAL_BRICKS[0]!;

/** Renders PiecesDrawer with the panel open so PieceTiles are visible. */
async function renderOpenDrawer() {
  // Import after mock is registered.
  const { PiecesDrawer } = await import('./PiecesDrawer');

  render(<PiecesDrawer />);

  // Open the drawer by clicking the toggle button.
  const user = userEvent.setup();
  const toggle = screen.getByRole('button', { name: /open pieces/i });
  await user.click(toggle);

  return { user };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PieceTile keyboard activation', () => {
  it('calls addAtCenter with the brick when Enter is pressed on a tile', async () => {
    const { user } = await renderOpenDrawer();

    const tiles = screen.getAllByTestId('piece-card');
    await user.type(tiles[0]!, '{Enter}');

    expect(mockAddAtCenter).toHaveBeenCalledTimes(1);
    expect(mockAddAtCenter).toHaveBeenCalledWith(
      expect.objectContaining({ code: FIRST_BRICK.code }),
    );
  });

  it('calls addAtCenter with the brick when Space is pressed on a tile', async () => {
    const { user } = await renderOpenDrawer();

    const tiles = screen.getAllByTestId('piece-card');
    await user.type(tiles[0]!, ' ');

    expect(mockAddAtCenter).toHaveBeenCalledTimes(1);
    expect(mockAddAtCenter).toHaveBeenCalledWith(
      expect.objectContaining({ code: FIRST_BRICK.code }),
    );
  });

  it('does not call addAtCenter for other keys', async () => {
    const { user } = await renderOpenDrawer();

    const tiles = screen.getAllByTestId('piece-card');
    await user.type(tiles[0]!, '{ArrowDown}');
    await user.type(tiles[0]!, 'a');

    expect(mockAddAtCenter).not.toHaveBeenCalled();
  });

  it('aria-label mentions "Enter or Space" for keyboard discoverability', async () => {
    await renderOpenDrawer();

    const tiles = screen.getAllByTestId('piece-card');
    const label = tiles[0]!.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/enter or space/i);
  });

  it('aria-label no longer says "click to place"', async () => {
    await renderOpenDrawer();

    const tiles = screen.getAllByTestId('piece-card');
    const label = tiles[0]!.getAttribute('aria-label') ?? '';
    expect(label).not.toMatch(/click to place/i);
  });
});
