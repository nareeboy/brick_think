import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/canvas/brickImage', () => ({
  loadBrickImage: vi.fn(),
}));

// react-konva renders to a Konva.Stage; for unit tests, mock to plain DOM.
vi.mock('react-konva', () => ({
  Image: ({ image, ...props }: { image: HTMLImageElement | null; [k: string]: unknown }) => (
    <div
      data-testid="kimage"
      data-src={image?.src ?? ''}
      data-x={String(props.x)}
      data-y={String(props.y)}
      data-rotation={String(props.rotation)}
    />
  ),
}));

import { loadBrickImage } from '@/lib/canvas/brickImage';
import { BrickImage } from './BrickImage';
import type { BrickInstance } from '@/components/builder/builderState';

const brick: BrickInstance = {
  id: 'b1',
  groupId: 'g1',
  code: '1x1',
  image: '/bricks/1x1.png',
  x: 100,
  y: 200,
  width: 32,
  height: 32,
  rotation: 90,
  visible: true,
};

describe('<BrickImage>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing while the image is loading', () => {
    (loadBrickImage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<BrickImage brick={brick} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the Konva image with positioning and rotation after load', async () => {
    const fake = { src: '/bricks/1x1.png' } as HTMLImageElement;
    (loadBrickImage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(fake);

    render(<BrickImage brick={brick} />);
    const node = await screen.findByTestId('kimage');
    expect(node.getAttribute('data-src')).toBe('/bricks/1x1.png');
    expect(node.getAttribute('data-x')).toBe('100');
    expect(node.getAttribute('data-y')).toBe('200');
    expect(node.getAttribute('data-rotation')).toBe('90');
  });
});
