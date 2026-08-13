'use client';

import { useCallback, useEffect, useRef } from 'react';

import { THUMBNAIL_CAPTURE_DEBOUNCE_MS, type BrickInstance, type LayerGroup } from './builderCore';

// Design-card thumbnail pipeline: BuilderCanvas registers a capture function
// on mount; edits debounce an auto-capture (see THUMBNAIL_CAPTURE_DEBOUNCE_MS
// for the timing rationale), and "Save version" captures on demand via
// captureAndUploadThumbnail. This MUST run while the canvas is still mounted:
// capturing on unmount or visibilitychange can't work — React tears down
// BuilderCanvas (which deregisters the capture fn and destroys the Konva
// layer) before a provider-level cleanup runs, and requestAnimationFrame
// (which the capture awaits) is paused in a hidden tab. liveMode (the Yjs
// worker owns the projection) and read-only views are excluded.
export function useThumbnailCapture({
  modelId,
  liveMode,
  readOnly,
  groups,
  bricks,
}: {
  modelId: string | null;
  liveMode: boolean;
  readOnly: boolean;
  /** Local canvas state; a change to either debounces an auto-capture. */
  groups: LayerGroup[];
  bricks: BrickInstance[];
}): {
  registerThumbnailCapture: (fn: (() => Promise<Blob | null>) | null) => void;
  captureAndUploadThumbnail: () => Promise<void>;
} {
  const captureFnRef = useRef<(() => Promise<Blob | null>) | null>(null);
  // Serializes captures so a debounce firing mid-upload can't double-post.
  const inFlightRef = useRef(false);
  // First run of the debounce effect is the initial hydration, not an edit —
  // skip it so merely opening a design doesn't schedule a capture.
  const initialRef = useRef(true);

  const registerThumbnailCapture = useCallback((fn: (() => Promise<Blob | null>) | null) => {
    captureFnRef.current = fn;
  }, []);

  const captureAndUploadThumbnail = useCallback(async (): Promise<void> => {
    if (!modelId) return;
    if (inFlightRef.current) return;
    const fn = captureFnRef.current;
    if (!fn) return;
    inFlightRef.current = true;
    try {
      const blob = await fn();
      if (!blob) return;
      const fd = new FormData();
      fd.append('file', blob, 'thumbnail.png');
      const res = await fetch(`/api/models/${modelId}/thumbnail`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(`thumbnail POST ${res.status}`);
    } catch (err) {
      console.error('thumbnail upload failed', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [modelId]);

  useEffect(() => {
    if (liveMode || readOnly) return;
    if (initialRef.current) {
      initialRef.current = false;
      return; // initial hydration, not an edit
    }
    const timer = setTimeout(() => {
      void captureAndUploadThumbnail();
    }, THUMBNAIL_CAPTURE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [groups, bricks, liveMode, readOnly, captureAndUploadThumbnail]);

  return { registerThumbnailCapture, captureAndUploadThumbnail };
}
