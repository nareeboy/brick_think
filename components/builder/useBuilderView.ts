'use client';

import { useCallback, useMemo, useState } from 'react';

import { MAX_ZOOM, MIN_ZOOM, type View } from './builderCore';

// Pan/zoom viewport state for the canvas. zoomBy keeps the given screen
// anchor fixed while scaling.
export function useBuilderView(): {
  view: View;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  zoomBy: (factor: number, anchor: { x: number; y: number }) => void;
} {
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const zoomBy = useCallback((factor: number, anchor: { x: number; y: number }) => {
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
  }, []);

  const view = useMemo<View>(() => ({ pan, zoom }), [pan, zoom]);

  return { view, setPan, setZoom, zoomBy };
}
