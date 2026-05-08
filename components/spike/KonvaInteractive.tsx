'use client';

import type Konva from 'konva';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as KImage, Layer, Rect, Stage } from 'react-konva';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT } from '@/lib/bricks/types';
import { loadBrickImage } from '@/lib/canvas/brickImage';
import { RECOLOUR_PALETTE } from '@/lib/canvas/palette';

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

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 480;
const SCALE = 4;

function pickInitialBricks(): BrickInstance[] {
  const codes = ['brick-2x4', 'plate-2x4', 'window-1x2', 'flower-1x1', 'connector-line'];
  return codes.map((code, idx) => {
    const def = CANONICAL_BRICKS.find((b) => b.code === code);
    if (!def) throw new Error(`Missing canonical brick ${code}`);
    return {
      id: `b${idx}`,
      code,
      studsX: def.studsX,
      studsY: def.studsY,
      x: 80 + idx * 130,
      y: 200,
      rotation: 0,
      colour: def.defaultColour,
    };
  });
}

interface BrickNodeProps {
  brick: BrickInstance;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

function BrickNode({ brick, selected, onSelect, onMove }: BrickNodeProps) {
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
      onMouseDown={() => onSelect(brick.id)}
      onTap={() => onSelect(brick.id)}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        onMove(brick.id, e.target.x(), e.target.y());
      }}
      stroke={selected ? '#2563eb' : undefined}
      strokeWidth={selected ? 3 : 0}
    />
  );
}

export function KonvaInteractive() {
  const [bricks, setBricks] = useState<BrickInstance[]>(() => pickInitialBricks());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const updateSelected = useCallback(
    (mutator: (b: BrickInstance) => BrickInstance) => {
      if (!selectedId) return;
      setBricks((prev) => prev.map((b) => (b.id === selectedId ? mutator(b) : b)));
    },
    [selectedId],
  );

  const rotate = useCallback(() => {
    updateSelected((b) => ({ ...b, rotation: (b.rotation + 90) % 360 }));
  }, [updateSelected]);

  const recolour = useCallback(() => {
    updateSelected((b) => {
      const idx = RECOLOUR_PALETTE.indexOf(b.colour as (typeof RECOLOUR_PALETTE)[number]);
      const next = RECOLOUR_PALETTE[(idx + 1) % RECOLOUR_PALETTE.length] ?? RECOLOUR_PALETTE[0];
      return { ...b, colour: next ?? b.colour };
    });
  }, [updateSelected]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={rotate}
          disabled={!selectedId}
          className="rounded-md border border-border bg-background px-3 py-1.5 font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Rotate 90
        </button>
        <button
          type="button"
          onClick={recolour}
          disabled={!selectedId}
          className="rounded-md border border-border bg-background px-3 py-1.5 font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Recolour
        </button>
        <span className="ml-2 text-muted-foreground">
          {selectedId ? `Selected: ${selectedId}` : 'Click a brick to select'}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            if (e.target === e.target.getStage()) setSelectedId(null);
          }}
        >
          <Layer>
            <Rect x={0} y={0} width={STAGE_WIDTH} height={STAGE_HEIGHT} fill="transparent" />
            {bricks.map((b) => (
              <BrickNode
                key={b.id}
                brick={b}
                selected={selectedId === b.id}
                onSelect={setSelectedId}
                onMove={(id, x, y) => {
                  setBricks((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
                }}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
