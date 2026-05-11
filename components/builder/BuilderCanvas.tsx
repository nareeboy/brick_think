'use client';

import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { Image as KImage, Layer, Stage } from 'react-konva';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT } from '@/lib/bricks/types';
import { loadBrickImage } from '@/lib/canvas/brickImage';

const SCALE = 4;

interface SeedSpec {
  code: string;
  dx: number;
  dy: number;
  rotation?: number;
}

const SEED: readonly SeedSpec[] = [
  { code: 'brick-2x4', dx: -200, dy: 30 },
  { code: 'plate-2x4', dx: -60, dy: -50 },
  { code: 'brick-2x2', dx: 60, dy: -90, rotation: 90 },
  { code: 'window-1x2', dx: 150, dy: 0 },
  { code: 'flower-1x1', dx: 230, dy: -100 },
  { code: 'brick-1x6', dx: -160, dy: 130 },
  { code: 'connector-line', dx: 40, dy: 130, rotation: 90 },
  { code: 'figure-head', dx: 200, dy: 110 },
];

interface BrickInstance {
  id: string;
  code: string;
  studsX: number;
  studsY: number;
  x: number;
  y: number;
  rotation: number;
  colour: string;
}

function makeSeedBricks(width: number, height: number): BrickInstance[] {
  const cx = width / 2;
  const cy = height / 2;
  return SEED.map((entry, idx) => {
    const def = CANONICAL_BRICKS.find((b) => b.code === entry.code);
    if (!def) throw new Error(`Missing canonical brick ${entry.code}`);
    return {
      id: `seed-${idx}`,
      code: entry.code,
      studsX: def.studsX,
      studsY: def.studsY,
      x: cx + entry.dx,
      y: cy + entry.dy,
      rotation: entry.rotation ?? 0,
      colour: def.defaultColour,
    };
  });
}

interface BrickNodeProps {
  brick: BrickInstance;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
}

function BrickNode({ brick, selected, onSelect, onMove, onRotate }: BrickNodeProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    loadBrickImage(brick.code, brick.colour)
      .then((img) => {
        if (active) setImage(img);
      })
      .catch((err: unknown) => {
        console.error('Failed to load brick', brick.code, err);
      });
    return () => {
      active = false;
    };
  }, [brick.code, brick.colour]);

  if (!image) return null;

  const w = brick.studsX * BRICK_BASE_UNIT * SCALE;
  const h = brick.studsY * BRICK_BASE_UNIT * SCALE;

  return (
    <KImage
      image={image}
      x={brick.x}
      y={brick.y}
      width={w}
      height={h}
      offsetX={w / 2}
      offsetY={h / 2}
      rotation={brick.rotation}
      draggable
      stroke={selected ? '#c0613d' : undefined}
      strokeWidth={selected ? 3 : 0}
      shadowColor={selected ? '#c0613d' : 'transparent'}
      shadowBlur={selected ? 18 : 0}
      shadowOpacity={selected ? 0.35 : 0}
      onMouseDown={() => onSelect(brick.id)}
      onTap={() => onSelect(brick.id)}
      onDblClick={() => onRotate(brick.id)}
      onDblTap={() => onRotate(brick.id)}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        onMove(brick.id, e.target.x(), e.target.y());
      }}
    />
  );
}

export function BuilderCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [bricks, setBricks] = useState<BrickInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (seededRef.current) return;
    if (size.width === 0 || size.height === 0) return;
    seededRef.current = true;
    setBricks(makeSeedBricks(size.width, size.height));
  }, [size]);

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) setSelectedId(null);
  }

  function handleMove(id: string, x: number, y: number) {
    setBricks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)));
  }

  function handleRotate(id: string) {
    setBricks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, rotation: (b.rotation + 90) % 360 } : b)),
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && size.height > 0 ? (
        <Stage width={size.width} height={size.height} onMouseDown={handleStageMouseDown}>
          <Layer>
            {bricks.map((b) => (
              <BrickNode
                key={b.id}
                brick={b}
                selected={selectedId === b.id}
                onSelect={setSelectedId}
                onMove={handleMove}
                onRotate={handleRotate}
              />
            ))}
          </Layer>
        </Stage>
      ) : null}
    </div>
  );
}
