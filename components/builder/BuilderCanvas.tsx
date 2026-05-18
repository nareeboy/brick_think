'use client';

import type Konva from 'konva';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Image as KImage, Layer, Rect, Stage, Transformer } from 'react-konva';

import { useBrickImage } from '@/components/canvas/BrickImage';
import { fitToBox, padBbox, unionRects } from '@/lib/canvas/thumbnailBox';
import { usePeerPresence } from '@/lib/yjs/usePeerPresence';

import {
  MAX_PIECE_SIZE,
  MAX_ZOOM,
  MIN_PIECE_SIZE,
  MIN_ZOOM,
  ZOOM_STEP,
  useBuilderState,
  type BrickInstance,
} from './builderState';

const PAN_DRAG_THRESHOLD_PX = 3;

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
  panLocked: boolean;
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
  panLocked,
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
      // While the user holds Space to pan, suppress brick interactions
      // (select/drag/transform) so the pointer-down on a brick falls
      // through to the canvas-level pan handler.
      draggable={!panLocked}
      listening={!panLocked}
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
    setPan,
    zoomBy,
    registerThumbnailCapture,
    liveMode,
    publishCursor,
    clearCursor,
    awareness,
    selfClientId,
    self,
  } = useBuilderState();
  const presence = usePeerPresence(awareness, selfClientId, self ?? null);
  const peerOutlinesByBrick = useMemo(() => {
    const m = new Map<
      string,
      Array<{ clientId: number; userId: string; color: string }>
    >();
    for (const [brickId, peers] of presence.selectionsByBrick) {
      m.set(
        brickId,
        peers.map((p) => ({ clientId: p.clientId, userId: p.userId, color: p.color })),
      );
    }
    return m;
  }, [presence.selectionsByBrick]);
  const { pan, zoom } = view;
  const lastCursorPublishRef = useRef(0);
  const [interacting, setInteracting] = useState(false);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRegistry = useRef(new Map<string, Konva.Image>());
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  // Spacebar-held pan mode (Figma convention). When true, brick
  // interactions are suppressed and any drag pans the canvas.
  const [panLocked, setPanLocked] = useState(false);

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
    if (panLocked || e.target === e.target.getStage()) {
      // panLocked: every drag pans, even over a brick (Brick listening is
      // already off via the panLocked prop, so this branch handles the
      // empty-area case where the event reaches the Stage).
      // Otherwise: click started on the empty stage background — arm a pan
      // candidate and defer the deselect to pointerup-without-drag.
      panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    panStartRef.current = null;
  }

  function handleContainerPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Konva's onMouseDown fires first (its native listener on .konvajs-content
    // runs during bubble before React's delegated dispatcher). By this point
    // panStartRef is either set (started on stage background) or null (started
    // on a brick). All we add here is DOM pointer capture so pan tracking
    // survives the pointer leaving the canvas mid-drag.
    if (
      panStartRef.current &&
      typeof e.currentTarget.setPointerCapture === 'function'
    ) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }

  function handleContainerPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    // Publish presence cursor on every move (throttled to ~30 Hz) when live.
    if (liveMode && containerRef.current) {
      const now = performance.now();
      if (now - lastCursorPublishRef.current >= 33) {
        lastCursorPublishRef.current = now;
        const rect = containerRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - pan.x) / zoom;
        const worldY = (e.clientY - rect.top - pan.y) / zoom;
        publishCursor(worldX, worldY);
      }
    }
    const start = panStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!isPanning) {
      if (Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD_PX) return;
      setIsPanning(true);
    }
    start.x = e.clientX;
    start.y = e.clientY;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function handleContainerPointerLeave() {
    if (liveMode) clearCursor();
  }

  function endPan(e: ReactPointerEvent<HTMLDivElement>) {
    if (!panStartRef.current) return;
    const wasPanning = isPanning;
    panStartRef.current = null;
    if (wasPanning) setIsPanning(false);
    else selectBrick(null);
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
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

  // Spacebar held → pan-lock. Released → back to brick interaction. Skipped
  // while an input is focused so typing a space in a label doesn't toggle
  // canvas mode. preventDefault on the keydown stops space from scrolling
  // the page when the canvas has no scroll container of its own.
  useEffect(() => {
    function shouldIgnore(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    }
    function onDown(e: KeyboardEvent) {
      if (e.code !== 'Space' || e.repeat) return;
      if (shouldIgnore(e.target)) return;
      e.preventDefault();
      setPanLocked(true);
    }
    function onUp(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      setPanLocked(false);
    }
    function onBlur() {
      // Window blur drops the keyup; clear the lock so it doesn't stick.
      setPanLocked(false);
    }
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

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
    <div
      ref={containerRef}
      data-testid="builder-canvas-surface"
      className={`absolute inset-0 touch-none ${
        isPanning ? 'cursor-grabbing' : panLocked ? 'cursor-grab' : ''
      }`}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onPointerLeave={handleContainerPointerLeave}
    >
      <ul aria-hidden="true" className="sr-only" data-testid="placed-brick-list">
        {visibleBricks.map((b) => (
          <li key={b.id} data-testid="placed-brick" data-brick-id={b.id} />
        ))}
        {visibleBricks.flatMap((b) =>
          (peerOutlinesByBrick.get(b.id) ?? []).map((po) => (
            <li
              key={`${b.id}:${po.clientId}`}
              data-testid={`peer-outline-${po.clientId}`}
              data-brick-id={b.id}
              data-color={po.color}
              data-user-id={po.userId}
            />
          )),
        )}
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
                  panLocked={panLocked}
                  onSelect={selectBrick}
                  onMove={handleMove}
                  onRotate={handleRotate}
                  onResize={handleResize}
                  registerNode={registerNode}
                  onInteractStart={() => setInteracting(true)}
                  onInteractEnd={() => setInteracting(false)}
                />
              ))}
              {visibleBricks.flatMap((b) => {
                const outlines = peerOutlinesByBrick.get(b.id) ?? [];
                return outlines.map((po, i) => {
                  const offsetPx = 2 + 4 * i;
                  const w = b.width + offsetPx * 2;
                  const h = b.height + offsetPx * 2;
                  return (
                    <Rect
                      key={`${b.id}:${po.clientId}`}
                      x={b.x}
                      y={b.y}
                      width={w}
                      height={h}
                      offsetX={w / 2}
                      offsetY={h / 2}
                      rotation={b.rotation}
                      stroke={po.color}
                      strokeWidth={3}
                      dash={[8, 4]}
                      listening={false}
                      fillEnabled={false}
                    />
                  );
                });
              })}
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
                // Suppress resize-handle interaction while space-pan is held.
                listening={!panLocked}
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
            <div
              className="pointer-events-auto absolute bottom-5 right-5 inline-flex items-center gap-1 rounded-2xl border border-zinc-900/10 bg-white/85 p-1.5 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur"
              onPointerDown={(e) => e.stopPropagation()}
            >
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
