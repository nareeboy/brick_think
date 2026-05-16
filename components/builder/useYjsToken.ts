'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface TokenState {
  token: string | null;
  expiresAt: number | null;
}

export interface UseYjsTokenResult {
  token: string | null;
  refresh: () => Promise<string | null>;
}

// Fetch a Yjs WebSocket auth token from /api/yjs/token and proactively refresh
// it ~10 s before expiry. The hook becomes a no-op when modelId is null.
export function useYjsToken(modelId: string | null): UseYjsTokenResult {
  const [state, setState] = useState<TokenState>({
    token: null,
    expiresAt: null,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;

  const mint = useCallback(async (): Promise<string | null> => {
    const id = modelIdRef.current;
    if (!id) return null;
    const res = await fetch('/api/yjs/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: id }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token: string; expiresAt: number };
    setState({ token: body.token, expiresAt: body.expiresAt });
    return body.token;
  }, []);

  useEffect(() => {
    if (!modelId) {
      setState({ token: null, expiresAt: null });
      return;
    }
    void mint();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [modelId, mint]);

  useEffect(() => {
    if (!state.expiresAt) return;
    const now = Math.floor(Date.now() / 1000);
    const refreshIn = Math.max(5, state.expiresAt - now - 10);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void mint();
    }, refreshIn * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.expiresAt, mint]);

  return {
    token: state.token,
    refresh: mint,
  };
}
