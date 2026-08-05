import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  return { user, toggle };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('drawer dismissal', () => {
  it('closes when a pointerdown lands outside the drawer (canvas click)', async () => {
    const { toggle } = await renderOpenDrawer();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.pointerDown(document.body);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('stays open when a pointerdown lands inside the panel', async () => {
    const { toggle } = await renderOpenDrawer();

    fireEvent.pointerDown(screen.getByTestId('pieces-drawer-panel'));

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggle button closes the open drawer without immediately reopening it', async () => {
    const { user, toggle } = await renderOpenDrawer();

    // A real click fires pointerdown (outside-dismiss) then click (toggle);
    // the two must not cancel out and leave the drawer open again.
    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape', async () => {
    const { toggle } = await renderOpenDrawer();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('drawer layering', () => {
  it('panel stacks above the canvas chrome buttons (z-40 over their z-30)', async () => {
    await renderOpenDrawer();

    expect(screen.getByTestId('pieces-drawer-panel').className).toMatch(/\bz-40\b/);
  });
});

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
