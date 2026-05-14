'use client';

import type Konva from 'konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as KImage, Layer, Stage, Transformer } from 'react-konva';

import { useBrickImage } from '@/components/canvas/BrickImage';
import { fitToBox, padBbox, unionRects } from '@/lib/canvas/thumbnailBox';

import {
  MAX_PIECE_SIZE,
  MAX_ZOOM,
  MIN_PIECE_SIZE,
  MIN_ZOOM,
  ZOOM_STEP,
  useBuilderState,
  type BrickInstance,
} from './builderState';

function selectionOverlay(
  brick: BrickInstance,
  pan: { x: number; y: number },
  zoom: number,
): { left: number; top: number } {
  const rad = (brick.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bh = brick.width * sin + brick.height * cos;
  const topStage = brick.y - bh / 2;
  return {
    left: brick.x * zoom + pan.x,
    top: topStage * zoom + pan.y,
  };
}

interface BrickNodeProps {
  brick: BrickInstance;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
  onInteractStart: () => void;
  onInteractEnd: () => void;
}

function BrickNode({
  brick,
  selected,
  onSelect,
  onMove,
  onRotate,
  onResize,
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
      onDragStart={onInteractStart}
      onTransformStart={onInteractStart}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        onMove(brick.id, e.target.x(), e.target.y());
        onInteractEnd();
      }}
      onTransformEnd={() => {
        const node = nodeRef.current;
        if (!node) {
          onInteractEnd();
          return;
        }
        const sx = node.scaleX();
        const sy = node.scaleY();
        const nextW = Math.max(MIN_PIECE_SIZE, Math.min(MAX_PIECE_SIZE, brick.width * sx));
        const nextH = Math.max(MIN_PIECE_SIZE, Math.min(MAX_PIECE_SIZE, brick.height * sy));
        node.scaleX(1);
        node.scaleY(1);
        onResize(brick.id, nextW, nextH);
        onInteractEnd();
      }}
    />
  );
}

export function BuilderCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const {
    groups,
    bricks,
    selectedId,
    selectBrick,
    updateBrick,
    deleteBrick,
    view,
    zoomBy,
    registerThumbnailCapture,
  } = useBuilderState();
  const { pan, zoom } = view;
  const [interacting, setInteracting] = useState(false);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRegistry = useRef(new Map<string, Konva.Image>());

  const visibleBricks = useMemo(() => {
    const groupVisible = new Map<string, boolean>();
    for (const g of groups) groupVisible.set(g.id, g.visible);
    // Draw order = panel bottom-to-top, so reverse `bricks` (which is panel
    // top-to-bottom, grouped by groupId in `groups` order). Hidden bricks /
    // bricks in hidden groups are excluded entirely.
    const visible = bricks.filter(
      (b) => b.visible && groupVisible.get(b.groupId) !== false,
    );
    return visible.slice().reverse();
  }, [bricks, groups]);

  function zoomFromCenter(factor: number) {
    zoomBy(factor, { x: size.width / 2, y: size.height / 2 });
  }

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
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (selectedId === null) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRegistry.current.get(selectedId);
    if (node) {
      transformer.nodes([node]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId, bricks]);

  function registerNode(id: string, node: Konva.Image | null) {
    if (node) nodeRegistry.current.set(id, node);
    else nodeRegistry.current.delete(id);
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) selectBrick(null);
  }

  function handleMove(id: string, x: number, y: number) {
    updateBrick(id, { x, y });
  }

  function handleRotate(id: string) {
    const brick = bricks.find((b) => b.id === id);
    if (!brick) return;
    updateBrick(id, { rotation: (brick.rotation + 90) % 360 });
  }

  function handleResize(id: string, width: number, height: number) {
    updateBrick(id, { width, height });
  }

  function handleDelete(id: string) {
    deleteBrick(id);
    nodeRegistry.current.delete(id);
  }

  useEffect(() => {
    if (selectedId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      e.preventDefault();
      handleDelete(selectedId!);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    registerThumbnailCapture(async () => {
      await new Promise(requestAnimationFrame);
      const layer = layerRef.current;
      if (!layer) return null;
      const nodes = Array.from(nodeRegistry.current.values());
      if (nodes.length === 0) return null;
      const rects = nodes.map((n) =>
        n.getClientRect({ skipTransform: false, relativeTo: layer }),
      );
      const bbox = unionRects(rects);
      const padded = padBbox(bbox, 0.08);
      const { scale } = fitToBox(padded, 400, 300);
      const dataUrl = layer.toDataURL({
        x: padded.x,
        y: padded.y,
        width: padded.width,
        height: padded.height,
        pixelRatio: scale,
      });
      const res = await fetch(dataUrl);
      return res.blob();
    });
    return () => registerThumbnailCapture(null);
  }, [registerThumbnailCapture]);

  const selectedBrick = selectedId ? bricks.find((b) => b.id === selectedId) ?? null : null;
  const overlay = selectedBrick && !interacting ? selectionOverlay(selectedBrick, pan, zoom) : null;

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ul aria-hidden="true" className="sr-only" data-testid="placed-brick-list">
        {visibleBricks.map((b) => (
          <li key={b.id} data-testid="placed-brick" data-brick-id={b.id} />
        ))}
      </ul>
      {size.width > 0 && size.height > 0 ? (
        <>
          <Stage
            width={size.width}
            height={size.height}
            x={pan.x}
            y={pan.y}
            scaleX={zoom}
            scaleY={zoom}
            onMouseDown={handleStageMouseDown}
          >
            <Layer ref={layerRef}>
              {visibleBricks.map((b) => (
                <BrickNode
                  key={b.id}
                  brick={b}
                  selected={selectedId === b.id}
                  onSelect={selectBrick}
                  onMove={handleMove}
                  onRotate={handleRotate}
                  onResize={handleResize}
                  registerNode={registerNode}
                  onInteractStart={() => setInteracting(true)}
                  onInteractEnd={() => setInteracting(false)}
                />
              ))}
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                anchorSize={10}
                borderStroke="#c0613d"
                anchorStroke="#c0613d"
                anchorFill="#ffffff"
                anchorCornerRadius={2}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < MIN_PIECE_SIZE || newBox.height < MIN_PIECE_SIZE) return oldBox;
                  if (newBox.width > MAX_PIECE_SIZE || newBox.height > MAX_PIECE_SIZE) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
          <div className="pointer-events-none absolute inset-0 z-30">
            {overlay && selectedId ? (
              <button
                type="button"
                aria-label="Delete piece"
                onClick={() => handleDelete(selectedId)}
                style={{
                  position: 'absolute',
                  left: overlay.left,
                  top: overlay.top,
                  transform: 'translate(-50%, calc(-100% - 12px))',
                }}
                className="pointer-events-auto inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white text-zinc-700 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)] transition-colors hover:border-red-500/30 hover:bg-red-500 hover:text-white"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            ) : null}
            <div className="pointer-events-auto absolute bottom-5 right-5 inline-flex items-center gap-1 rounded-2xl border border-zinc-900/10 bg-white/85 p-1.5 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
              <ZoomButton
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM + 1e-6}
                onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
              >
                <ZoomOutIcon className="h-4 w-4" />
              </ZoomButton>
              <span className="min-w-[3ch] select-none px-1 text-center text-[11px] font-medium tabular-nums text-zinc-600">
                {Math.round(zoom * 100)}%
              </span>
              <ZoomButton
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM - 1e-6}
                onClick={() => zoomFromCenter(ZOOM_STEP)}
              >
                <ZoomInIcon className="h-4 w-4" />
              </ZoomButton>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ZoomButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className="inline-flex h-9 w-9 !cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:!cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
      {...props}
    >
      {children}
    </button>
  );
}

function ZoomInIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" />
      <path d="M11 8v6" />
    </svg>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="m5 6 1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function ZoomOutIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" />
    </svg>
  );
}
