import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(cleanup);

vi.mock('./ShareCanvas', () => ({
  ShareCanvas: () => <div data-testid="share-canvas" />,
  SHARE_ZOOM_LIMITS: { MIN_ZOOM: 0.25, MAX_ZOOM: 4, ZOOM_STEP: 1.25 },
}));

import { ShareView } from './ShareView';

describe('<ShareView>', () => {
  const canvasState = { groups: [], bricks: [] };

  it('renders the title and canvas', () => {
    render(<ShareView title="My design" canvasState={canvasState} />);
    expect(screen.getByText('My design')).toBeTruthy();
    expect(screen.getByTestId('share-canvas')).toBeTruthy();
  });

  it('renders the attribution link to /', () => {
    render(<ShareView title="x" canvasState={canvasState} />);
    const link = screen.getByRole('link', { name: /made with brickthink/i });
    expect(link.getAttribute('href')).toBe('/');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('does not render any save / history / sidebar affordances', () => {
    render(<ShareView title="x" canvasState={canvasState} />);
    expect(screen.queryByRole('button', { name: /save version/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /version history/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /open pieces/i })).toBeNull();
  });
});
