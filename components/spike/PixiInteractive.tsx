'use client';

import { Application, Graphics, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT } from '@/lib/bricks/types';
import { loadBrickImage } from '@/lib/canvas/brickImage';
import { RECOLOUR_PALETTE } from '@/lib/canvas/palette';

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 480;
const SCALE = 4;

interface BrickInstance {
  id: string;
  code: string;
  studsX: number;
  studsY: number;
  x: number;
  y: number;
  rotationDeg: number;
  colour: string;
}

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
      rotationDeg: 0,
      colour: def.defaultColour,
    };
  });
}

interface SpriteHandle {
  setPosition: (x: number, y: number) => void;
  setRotationDeg: (deg: number) => void;
  setColour: (colour: string) => void;
  setSelected: (selected: boolean) => void;
  destroy: () => void;
}

export function PixiInteractive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bricks, setBricks] = useState<BrickInstance[]>(() => pickInitialBricks());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const handlesRef = useRef<Map<string, SpriteHandle>>(new Map());
  const stateRef = useRef({ bricks, selectedId });
  stateRef.current = { bricks, selectedId };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const app = new Application();
      await app.init({
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        autoStart: false,
      });
      if (destroyed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }
      container.appendChild(app.canvas);

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
        if (event.target === app.stage) setSelectedId(null);
      });

      const handles = handlesRef.current;
      for (const brick of stateRef.current.bricks) {
        const handle = await mountBrick(app, brick, setBricks, setSelectedId);
        handles.set(brick.id, handle);
      }
      app.render();

      cleanup = () => {
        for (const handle of handles.values()) handle.destroy();
        handles.clear();
        app.destroy(true, { children: true, texture: false });
      };
    })();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const handles = handlesRef.current;
    for (const brick of bricks) {
      const handle = handles.get(brick.id);
      if (!handle) continue;
      handle.setPosition(brick.x, brick.y);
      handle.setRotationDeg(brick.rotationDeg);
      handle.setColour(brick.colour);
      handle.setSelected(brick.id === selectedId);
    }
  }, [bricks, selectedId]);

  function rotate() {
    if (!selectedId) return;
    setBricks((prev) =>
      prev.map((b) =>
        b.id === selectedId ? { ...b, rotationDeg: (b.rotationDeg + 90) % 360 } : b,
      ),
    );
  }

  function recolour() {
    if (!selectedId) return;
    setBricks((prev) =>
      prev.map((b) => {
        if (b.id !== selectedId) return b;
        const idx = RECOLOUR_PALETTE.indexOf(b.colour as (typeof RECOLOUR_PALETTE)[number]);
        const next = RECOLOUR_PALETTE[(idx + 1) % RECOLOUR_PALETTE.length] ?? RECOLOUR_PALETTE[0];
        return { ...b, colour: next ?? b.colour };
      }),
    );
  }

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
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-border bg-muted/40"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      />
    </div>
  );
}

async function mountBrick(
  app: Application,
  brick: BrickInstance,
  setBricks: (updater: (prev: BrickInstance[]) => BrickInstance[]) => void,
  setSelectedId: (id: string) => void,
): Promise<SpriteHandle> {
  const w = brick.studsX * BRICK_BASE_UNIT * SCALE;
  const h = brick.studsY * BRICK_BASE_UNIT * SCALE;

  const image = await loadBrickImage(brick.code, brick.colour);
  const texture = Texture.from(image);

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.width = w;
  sprite.height = h;
  sprite.x = brick.x;
  sprite.y = brick.y;
  sprite.rotation = (brick.rotationDeg * Math.PI) / 180;
  sprite.eventMode = 'static';
  sprite.cursor = 'pointer';

  const outline = new Graphics();
  outline.rect(-w / 2, -h / 2, w, h).stroke({ width: 3, color: 0x2563eb });
  outline.visible = false;
  sprite.addChild(outline);

  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragging = false;

  sprite.on('pointerdown', (event: FederatedPointerEvent) => {
    setSelectedId(brick.id);
    dragging = true;
    dragOffsetX = event.global.x - sprite.x;
    dragOffsetY = event.global.y - sprite.y;
    event.stopPropagation();
  });

  app.stage.on('pointermove', (event: FederatedPointerEvent) => {
    if (!dragging) return;
    sprite.x = event.global.x - dragOffsetX;
    sprite.y = event.global.y - dragOffsetY;
    app.render();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    const x = sprite.x;
    const y = sprite.y;
    setBricks((prev) => prev.map((b) => (b.id === brick.id ? { ...b, x, y } : b)));
  }

  app.stage.on('pointerup', endDrag);
  app.stage.on('pointerupoutside', endDrag);

  app.stage.addChild(sprite);

  let currentColour = brick.colour;

  return {
    setPosition(x, y) {
      if (sprite.x !== x) sprite.x = x;
      if (sprite.y !== y) sprite.y = y;
      app.render();
    },
    setRotationDeg(deg) {
      sprite.rotation = (deg * Math.PI) / 180;
      app.render();
    },
    setColour(colour) {
      if (colour === currentColour) return;
      currentColour = colour;
      void loadBrickImage(brick.code, colour).then((nextImage) => {
        sprite.texture = Texture.from(nextImage);
        app.render();
      });
    },
    setSelected(selected) {
      outline.visible = selected;
      app.render();
    },
    destroy() {
      sprite.destroy({ children: true });
    },
  };
}
