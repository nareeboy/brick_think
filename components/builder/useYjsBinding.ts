'use client';

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import {
  projectDocToCanvas,
  seedDocFromCanvas,
  YJS_SEED_ORIGIN,
} from '@/lib/yjs/canvas-codec';

import type { BrickInstance, LayerGroup } from './builderState';

export type YjsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface YjsBindingSnapshot {
  title: string;
  groups: LayerGroup[];
  bricks: BrickInstance[];
}

export interface UseYjsBindingArgs {
  modelId: string;
  initialCanvasState: { groups: LayerGroup[]; bricks: BrickInstance[] };
  initialTitle: string;
  token: string | null;
  wsBaseUrl: string;
}

export interface UseYjsBindingResult {
  doc: Y.Doc | null;
  snapshot: YjsBindingSnapshot;
  connectionStatus: YjsConnectionStatus;
}

// Owns a Y.Doc for the given modelId, syncs it with a WebsocketProvider when
// a token is available, and exposes a React-friendly snapshot derived from
// the doc. Local mutations call codec helpers directly on `doc`; the doc's
// update event mirrors them back through this snapshot.
export function useYjsBinding({
  modelId,
  initialCanvasState,
  initialTitle,
  token,
  wsBaseUrl,
}: UseYjsBindingArgs): UseYjsBindingResult {
  const [snapshot, setSnapshot] = useState<YjsBindingSnapshot>(() => ({
    title: initialTitle,
    groups: initialCanvasState.groups,
    bricks: initialCanvasState.bricks,
  }));
  const [connectionStatus, setConnectionStatus] =
    useState<YjsConnectionStatus>('connecting');
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  // Init Y.Doc once per modelId.
  useEffect(() => {
    if (!modelId) return undefined;
    const doc = new Y.Doc();
    docRef.current = doc;
    seedDocFromCanvas(doc, initialCanvasState, initialTitle);
    setSnapshot(projectDocToCanvas(doc));
    const onUpdate = (_u: Uint8Array, origin: unknown): void => {
      if (origin === YJS_SEED_ORIGIN) return;
      setSnapshot(projectDocToCanvas(doc));
    };
    doc.on('update', onUpdate);
    return () => {
      doc.off('update', onUpdate);
      doc.destroy();
      docRef.current = null;
    };
    // initialCanvasState + initialTitle are seed values; we intentionally
    // ignore later identity changes — the doc's own state is the truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  // Open/close WS provider when token changes.
  useEffect(() => {
    if (!token || !modelId) return undefined;
    const doc = docRef.current;
    if (!doc) return undefined;
    const provider = new WebsocketProvider(wsBaseUrl, modelId, doc, {
      params: { token },
      connect: true,
    });
    providerRef.current = provider;
    setConnectionStatus('connecting');
    const onStatus = (event: { status: string }): void => {
      if (event.status === 'connected') setConnectionStatus('connected');
      else if (event.status === 'disconnected')
        setConnectionStatus('disconnected');
      else setConnectionStatus('connecting');
    };
    provider.on('status', onStatus);
    return () => {
      provider.off('status', onStatus);
      provider.destroy();
      providerRef.current = null;
    };
  }, [token, modelId, wsBaseUrl]);

  return {
    doc: docRef.current,
    snapshot,
    connectionStatus,
  };
}
