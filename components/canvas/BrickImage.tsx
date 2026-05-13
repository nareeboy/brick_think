'use client';

import { useEffect, useState } from 'react';
import { Image as KImage } from 'react-konva';

import { loadBrickImage } from '@/lib/canvas/brickImage';
import type { BrickInstance } from '@/components/builder/builderState';

export function useBrickImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
    loadBrickImage(src)
      .then((img) => {
        if (active) setImage(img);
      })
      .catch((err: unknown) => {
        console.error('Failed to load brick image', src, err);
      });
    return () => {
      active = false;
    };
  }, [src]);
  return image;
}

export function BrickImage({ brick }: { brick: BrickInstance }) {
  const image = useBrickImage(brick.image);
  if (!image) return null;

  return (
    <KImage
      image={image}
      x={brick.x}
      y={brick.y}
      width={brick.width}
      height={brick.height}
      offsetX={brick.width / 2}
      offsetY={brick.height / 2}
      rotation={brick.rotation}
    />
  );
}
