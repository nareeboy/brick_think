'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import type { BrickDefinition } from '@/lib/bricks/types';

import { useBuilderState, type BrickInstance } from './builderState';

const DROP_TARGET_ATTR = 'data-drop-target';
export const CANVAS_DROP_TARGET = 'canvas';
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  def: BrickDefinition;
  startX: number;
  startY: number;
  cursorX: number;
  cursorY: number;
  active: boolean;
  overCanvas: boolean;
  pointerId: number;
}

interface DragPieceContext {
  startDrag: (def: BrickDefinition, e: React.PointerEvent) => void;
  active: boolean;
}

const Ctx = createContext<DragPieceContext | null>(null);

export function DragPieceProvider({ children }: { children: ReactNode }) {
  const { setBricks, view } = useBuilderState();
  const viewRef = useRef(view);
  viewRef.current = view;

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const cancel = useCallback(() => {
    setDrag(null);
  }, []);

  const startDrag = useCallback((def: BrickDefinition, e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    setDrag({
      def,
      startX: e.clientX,
      startY: e.clientY,
      cursorX: e.clientX,
      cursorY: e.clientY,
      active: false,
      overCanvas: false,
      pointerId: e.pointerId,
    });
  }, []);

  useEffect(() => {
    if (!drag) return;

    function findDropTarget(x: number, y: number): HTMLElement | null {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      return (el as HTMLElement).closest(
        `[${DROP_TARGET_ATTR}="${CANVAS_DROP_TARGET}"]`,
      ) as HTMLElement | null;
    }

    function onMove(ev: PointerEvent) {
      const current = dragRef.current;
      if (!current || ev.pointerId !== current.pointerId) return;
      const dx = ev.clientX - current.startX;
      const dy = ev.clientY - current.startY;
      const past = current.active || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
      const target = past ? findDropTarget(ev.clientX, ev.clientY) : null;
      setDrag((prev) =>
        prev
          ? {
              ...prev,
              cursorX: ev.clientX,
              cursorY: ev.clientY,
              active: past,
              overCanvas: Boolean(target),
            }
          : prev,
      );
    }

    function onUp(ev: PointerEvent) {
      const current = dragRef.current;
      if (!current || ev.pointerId !== current.pointerId) return;
      if (!current.active) {
        cancel();
        return;
      }
      const target = findDropTarget(ev.clientX, ev.clientY);
      if (!target) {
        cancel();
        return;
      }
      const rect = target.getBoundingClientRect();
      const { pan, zoom } = viewRef.current;
      const x = (ev.clientX - rect.left - pan.x) / zoom;
      const y = (ev.clientY - rect.top - pan.y) / zoom;
      const instance: BrickInstance = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `brick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        code: current.def.code,
        image: current.def.image,
        width: current.def.width,
        height: current.def.height,
        x,
        y,
        rotation: 0,
      };
      setBricks((prev) => [...prev, instance]);
      cancel();
    }

    function onCancel(ev: PointerEvent) {
      const current = dragRef.current;
      if (!current || ev.pointerId !== current.pointerId) return;
      cancel();
    }

    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') cancel();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
    };
  }, [drag, cancel, setBricks]);

  useEffect(() => {
    if (!drag?.active) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [drag?.active]);

  const value = useMemo<DragPieceContext>(
    () => ({ startDrag, active: drag?.active === true }),
    [startDrag, drag?.active],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {drag?.active ? (
        <DragGhost
          def={drag.def}
          x={drag.cursorX}
          y={drag.cursorY}
          zoom={view.zoom}
          overCanvas={drag.overCanvas}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useDragPiece(): DragPieceContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDragPiece must be used inside <DragPieceProvider>');
  return ctx;
}

interface DragGhostProps {
  def: BrickDefinition;
  x: number;
  y: number;
  zoom: number;
  overCanvas: boolean;
}

function DragGhost({ def, x, y, zoom, overCanvas }: DragGhostProps) {
  if (typeof document === 'undefined') return null;
  const width = def.width * zoom;
  const height = def.height * zoom;
  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate(${x - width / 2}px, ${y - height / 2}px)`,
        width,
        height,
        pointerEvents: 'none',
        opacity: overCanvas ? 0.9 : 0.4,
        transition: 'opacity 120ms ease-out',
        zIndex: 9999,
        filter: overCanvas
          ? 'drop-shadow(0 16px 24px rgba(192,97,61,0.35))'
          : 'drop-shadow(0 8px 12px rgba(0,0,0,0.18))',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={def.image}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>,
    document.body,
  );
}
