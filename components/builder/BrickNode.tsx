'use client';

import type Konva from 'konva';
import { useRef } from 'react';
import { Image as KImage } from 'react-konva';

import { useBrickImage } from '@/components/canvas/BrickImage';

import { MAX_PIECE_SIZE, MIN_PIECE_SIZE, type BrickInstance } from './builderState';

interface BrickNodeProps {
  brick: BrickInstance;
  selected: boolean;
  /**
   * Whether this brick accepts pointer interaction (drag / select / transform).
   * False while Space-pan is held OR the canvas is read-only — both cases want
   * the pointer-down to fall through to the canvas-level pan handler instead of
   * grabbing the brick.
   */
  interactive: boolean;
  onPointerSelect: (id: string, shiftKey: boolean) => void;
  onClickSelect: (id: string, shiftKey: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onContextMenu: (id: string, evt: MouseEvent) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
  onInteractStart: () => void;
  onInteractEnd: () => void;
}

export function BrickNode({
  brick,
  selected,
  interactive,
  onPointerSelect,
  onClickSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onRotate,
  onResize,
  onContextMenu,
  registerNode,
  onInteractStart,
  onInteractEnd,
}: BrickNodeProps) {
  const image = useBrickImage(brick.image);
  const nodeRef = useRef<Konva.Image | null>(null);

  if (!image) return null;

  return (
    <KImage
      ref={(node) => {
        nodeRef.current = node;
        registerNode(brick.id, node);
      }}
      image={image}
      x={brick.x}
      y={brick.y}
      width={brick.width}
      height={brick.height}
      offsetX={brick.width / 2}
      offsetY={brick.height / 2}
      rotation={brick.rotation}
      // Horizontal mirror around the brick centre (offset = centre, so a
      // negative x-scale flips in place).
      scaleX={brick.flippedX ? -1 : 1}
      // Suppress brick interactions (select/drag/transform) while Space-pan is
      // held or the canvas is read-only, so the pointer-down on a brick falls
      // through to the canvas-level pan handler instead of moving the piece.
      draggable={interactive}
      listening={interactive}
      stroke={selected ? '#a8482a' : undefined}
      strokeWidth={selected ? 3 : 0}
      shadowColor={selected ? '#a8482a' : 'transparent'}
      shadowBlur={selected ? 18 : 0}
      shadowOpacity={selected ? 0.35 : 0}
      onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) =>
        onPointerSelect(brick.id, e.evt.shiftKey)
      }
      onTap={() => onPointerSelect(brick.id, false)}
      // Konva suppresses click after a drag, so this only fires for a
      // press-and-release in place — the collapse-to-single gesture.
      onClick={(e: Konva.KonvaEventObject<MouseEvent>) => onClickSelect(brick.id, e.evt.shiftKey)}
      onDblClick={() => onRotate(brick.id)}
      onDblTap={() => onRotate(brick.id)}
      onContextMenu={(e: Konva.KonvaEventObject<PointerEvent>) => onContextMenu(brick.id, e.evt)}
      onDragStart={() => {
        onInteractStart();
        onDragStart(brick.id);
      }}
      onTransformStart={onInteractStart}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        onDragMove(brick.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        onDragEnd(brick.id, e.target.x(), e.target.y());
        onInteractEnd();
      }}
      onTransformEnd={() => {
        const node = nodeRef.current;
        if (!node) {
          onInteractEnd();
          return;
        }
        // abs() because a flipped brick's base x-scale is -1, so the
        // transformer reports a negative composite scale.
        const sx = Math.abs(node.scaleX());
        const sy = Math.abs(node.scaleY());
        const nextW = Math.max(MIN_PIECE_SIZE, Math.min(MAX_PIECE_SIZE, brick.width * sx));
        const nextH = Math.max(MIN_PIECE_SIZE, Math.min(MAX_PIECE_SIZE, brick.height * sy));
        node.scaleX(brick.flippedX ? -1 : 1);
        node.scaleY(1);
        onResize(brick.id, nextW, nextH);
        onInteractEnd();
      }}
    />
  );
}
