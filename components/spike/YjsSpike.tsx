'use client';

import type Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as KImage, Layer, Rect, Stage } from 'react-konva';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT } from '@/lib/bricks/types';
import { loadBrickImage } from '@/lib/canvas/brickImage';

const STAGE_WIDTH = 900;
const STAGE_HEIGHT = 540;
const SCALE = 3;
const SEED_BRICK_CODES = ['brick-2x4', 'plate-2x4', 'window-1x2', 'flower-1x1', 'connector-line'];

interface BrickJSON {
  code: string;
  x: number;
  y: number;
  rotation: number;
}

interface BrickSnap extends BrickJSON {
  id: string;
}

interface PeerCursor {
  clientId: number;
  name: string;
  colour: string;
  x: number;
  y: number;
}

interface PeerState {
  user?: { id?: string; name?: string; colour?: string };
  cursor?: { x?: number; y?: number };
}

const COLOURS = ['#c0613d', '#7a8b66', '#9bb7d4', '#d6a04b', '#a8557a', '#525c69'];

function makeIdentity(): { id: string; name: string; colour: string } {
  const id = (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `peer-${Math.random().toString(36).slice(2, 10)}`
  ) as string;
  const tag = id.slice(0, 4);
  const colour = COLOURS[Math.floor(Math.random() * COLOURS.length)] ?? COLOURS[0]!;
  return { id, name: `Guest ${tag}`, colour };
}

function buildSnapshot(map: Y.Map<BrickJSON>): BrickSnap[] {
  const out: BrickSnap[] = [];
  map.forEach((value: BrickJSON, key: string) => {
    out.push({ id: key, ...value });
  });
  return out;
}

function ensureSeed(map: Y.Map<BrickJSON>): void {
  if (map.size > 0) return;
  SEED_BRICK_CODES.forEach((code, idx) => {
    const def = CANONICAL_BRICKS.find((b) => b.code === code);
    if (!def) return;
    map.set(`seed-${idx}`, {
      code,
      x: 120 + idx * 140,
      y: STAGE_HEIGHT / 2,
      rotation: 0,
    });
  });
}

interface BrickNodeProps {
  brick: BrickSnap;
  onMove: (id: string, x: number, y: number) => void;
}

function BrickNode({ brick, onMove }: BrickNodeProps) {
  const def = useMemo(() => CANONICAL_BRICKS.find((b) => b.code === brick.code), [brick.code]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    loadBrickImage(brick.code)
      .then((img) => {
        if (active) setImage(img);
      })
      .catch((err: unknown) => {
        console.error('Failed to load brick', brick.code, err);
      });
    return () => {
      active = false;
    };
  }, [brick.code]);

  if (!def || !image) return null;

  const w = def.studsX * BRICK_BASE_UNIT * SCALE;
  const h = def.studsY * BRICK_BASE_UNIT * SCALE;

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
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        onMove(brick.id, e.target.x(), e.target.y());
      }}
    />
  );
}

interface YjsSpikeProps {
  roomName: string;
  websocketUrl: string;
}

export function YjsSpike({ roomName, websocketUrl }: YjsSpikeProps) {
  const identity = useMemo(makeIdentity, []);
  const [snapshot, setSnapshot] = useState<BrickSnap[]>([]);
  const [peers, setPeers] = useState<PeerCursor[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(websocketUrl, roomName, ydoc);
    ydocRef.current = ydoc;
    providerRef.current = provider;

    const bricks = ydoc.getMap<BrickJSON>('bricks');
    const refresh = () => setSnapshot(buildSnapshot(bricks));

    provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setStatus(event.status);
    });

    provider.on('synced', () => {
      ydoc.transact(() => ensureSeed(bricks));
      refresh();
    });

    bricks.observeDeep(refresh);

    provider.awareness.setLocalState({
      user: { id: identity.id, name: identity.name, colour: identity.colour },
      cursor: null,
    });

    const handleAwareness = () => {
      const states = provider.awareness.getStates();
      const others: PeerCursor[] = [];
      states.forEach((state, clientId) => {
        if (clientId === provider.awareness.clientID) return;
        const typed = state as PeerState;
        const cx = typed.cursor?.x;
        const cy = typed.cursor?.y;
        if (typeof cx !== 'number' || typeof cy !== 'number') return;
        others.push({
          clientId,
          name: typed.user?.name ?? 'Guest',
          colour: typed.user?.colour ?? '#525c69',
          x: cx,
          y: cy,
        });
      });
      setPeers(others);
    };

    provider.awareness.on('change', handleAwareness);
    handleAwareness();

    refresh();

    return () => {
      bricks.unobserveDeep(refresh);
      provider.awareness.off('change', handleAwareness);
      provider.awareness.setLocalState(null);
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [identity.colour, identity.id, identity.name, roomName, websocketUrl]);

  const handleBrickMove = useCallback((id: string, x: number, y: number) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const bricks = ydoc.getMap<BrickJSON>('bricks');
    const existing = bricks.get(id);
    if (!existing) return;
    bricks.set(id, { ...existing, x, y });
  }, []);

  const handleAddBrick = useCallback(() => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const bricks = ydoc.getMap<BrickJSON>('bricks');
    const code =
      SEED_BRICK_CODES[Math.floor(Math.random() * SEED_BRICK_CODES.length)] ?? 'brick-2x4';
    const id = `b-${crypto.randomUUID()}`;
    bricks.set(id, {
      code,
      x: 80 + Math.random() * (STAGE_WIDTH - 160),
      y: 80 + Math.random() * (STAGE_HEIGHT - 160),
      rotation: 0,
    });
  }, []);

  const handleStageMove = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent>) => {
      const provider = providerRef.current;
      if (!provider) return;
      const stage = event.target.getStage();
      const point = stage?.getPointerPosition();
      if (!point) return;
      provider.awareness.setLocalState({
        user: { id: identity.id, name: identity.name, colour: identity.colour },
        cursor: { x: point.x, y: point.y },
      });
    },
    [identity.colour, identity.id, identity.name],
  );

  const handleStageLeave = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;
    provider.awareness.setLocalState({
      user: { id: identity.id, name: identity.name, colour: identity.colour },
      cursor: null,
    });
  }, [identity.colour, identity.id, identity.name]);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm"
      >
        <span>
          Room: <strong className="font-mono">{roomName}</strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span data-testid="yjs-status">
          Status:{' '}
          <strong
            className={
              status === 'connected'
                ? 'text-success'
                : status === 'connecting'
                  ? 'text-muted-foreground'
                  : 'text-danger'
            }
          >
            {status}
          </strong>
        </span>
        <span className="text-muted-foreground">|</span>
        <span>
          Peers visible: <strong>{peers.length}</strong>
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: identity.colour }}
          />
          You are <strong className="font-mono">{identity.name}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleAddBrick}
          className="rounded-md border border-border bg-background px-3 py-1.5 font-medium transition-colors hover:bg-muted"
        >
          Add brick
        </button>
        <span className="text-muted-foreground">
          Open this URL in a second tab to see the canvas sync. Drag bricks. Watch the cursors.
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-border bg-muted/40"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        <Stage
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          onMouseMove={handleStageMove}
          onMouseLeave={handleStageLeave}
        >
          <Layer listening={false}>
            <Rect x={0} y={0} width={STAGE_WIDTH} height={STAGE_HEIGHT} fill="transparent" />
          </Layer>
          <Layer>
            {snapshot.map((b) => (
              <BrickNode key={b.id} brick={b} onMove={handleBrickMove} />
            ))}
          </Layer>
        </Stage>

        {peers.map((peer) => (
          <div
            key={peer.clientId}
            aria-hidden
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: peer.x, top: peer.y }}
          >
            <span
              className="block h-3 w-3 rounded-full ring-2 ring-white"
              style={{ background: peer.colour }}
            />
            <span
              className="mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ background: peer.colour }}
            >
              {peer.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
