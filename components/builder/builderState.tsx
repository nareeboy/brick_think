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

export interface BrickInstance {
  id: string;
  code: string;
  studsX: number;
  studsY: number;
  x: number;
  y: number;
  rotation: number;
  colour: string;
}

export const CANVAS_SCALE = 4;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.25;

interface ToastState {
  id: number;
  message: string;
}

interface View {
  pan: { x: number; y: number };
  zoom: number;
}

interface BuilderState {
  bricks: BrickInstance[];
  setBricks: React.Dispatch<React.SetStateAction<BrickInstance[]>>;
  view: View;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoomBy: (factor: number, anchor: { x: number; y: number }) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  savedAt: number | null;
  hasSavedVersion: boolean;
  save: () => void;
  rollback: () => void;
  toast: ToastState | null;
  dismissToast: () => void;
}

const Ctx = createContext<BuilderState | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [bricks, setBricks] = useState<BrickInstance[]>([]);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [savedSnapshot, setSavedSnapshot] = useState<BrickInstance[] | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomBy = useCallback(
    (factor: number, anchor: { x: number; y: number }) => {
      setZoom((prevZoom) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * factor));
        if (next === prevZoom) return prevZoom;
        const applied = next / prevZoom;
        setPan((p) => ({
          x: anchor.x - (anchor.x - p.x) * applied,
          y: anchor.y - (anchor.y - p.y) * applied,
        }));
        return next;
      });
    },
    [],
  );

  const showToast = useCallback((message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, message });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === toast.id ? null : t));
    }, 2800);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  const save = useCallback(() => {
    setSavedSnapshot(bricks.map((b) => ({ ...b })));
    setSavedAt(Date.now());
    showToast('Build saved to canvas');
  }, [bricks, showToast]);

  const rollback = useCallback(() => {
    if (!savedSnapshot) return;
    setBricks(savedSnapshot.map((b) => ({ ...b })));
  }, [savedSnapshot]);

  const view = useMemo<View>(() => ({ pan, zoom }), [pan, zoom]);

  const value = useMemo<BuilderState>(
    () => ({
      bricks,
      setBricks,
      view,
      setPan,
      setZoom,
      zoomBy,
      savedAt,
      hasSavedVersion: savedSnapshot !== null,
      save,
      rollback,
      toast,
      dismissToast,
    }),
    [bricks, view, zoomBy, savedAt, savedSnapshot, save, rollback, toast, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBuilderState(): BuilderState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBuilderState must be used inside <BuilderProvider>');
  return ctx;
}

export function useRelativeTime(timestamp: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timestamp === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (timestamp === null) return null;
  const delta = Math.max(0, now - timestamp);
  const s = Math.floor(delta / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
