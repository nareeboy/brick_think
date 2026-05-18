import { parseCanvasState } from '@/lib/models/canvasState';
import type { CanvasState } from '@/lib/models/types';

export const EXPORT_FORMAT = 'brickthink.design' as const;
export const EXPORT_VERSION = 1 as const;

export interface DesignExportEnvelopeV1 {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  title: string;
  canvasState: CanvasState;
}

export function buildExportEnvelope(input: {
  title: string;
  canvasState: CanvasState;
}): DesignExportEnvelopeV1 {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    title: input.title,
    canvasState: input.canvasState,
  };
}

export function renderEnvelopeToBlob(env: DesignExportEnvelopeV1): Blob {
  return new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' });
}

export type ParseResult =
  | { ok: true; value: DesignExportEnvelopeV1 }
  | { ok: false; error: string };

export function parseExportEnvelope(raw: unknown): ParseResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Not a BrickThink design file' };
  }
  const o = raw as Record<string, unknown>;
  if (o.format !== EXPORT_FORMAT) {
    return { ok: false, error: 'Not a BrickThink design file' };
  }
  if (o.version !== EXPORT_VERSION) {
    return { ok: false, error: `Unsupported file version: ${String(o.version)}` };
  }
  if (typeof o.exportedAt !== 'string' || Number.isNaN(Date.parse(o.exportedAt))) {
    return { ok: false, error: 'Missing or invalid exportedAt' };
  }
  if (typeof o.title !== 'string' || o.title.length === 0 || o.title.length > 200) {
    return { ok: false, error: 'Missing or invalid title' };
  }
  if (
    !o.canvasState ||
    typeof o.canvasState !== 'object' ||
    !Array.isArray((o.canvasState as { groups?: unknown }).groups) ||
    !Array.isArray((o.canvasState as { bricks?: unknown }).bricks)
  ) {
    return { ok: false, error: 'Missing or invalid canvasState' };
  }
  const incoming = o.canvasState as { groups: unknown[]; bricks: unknown[] };
  const parsed = parseCanvasState(o.canvasState);
  // parseCanvasState silently drops malformed entries. Compare counts so a
  // file with structurally-broken bricks fails fast rather than landing in
  // the DB minus some content.
  if (parsed.groups.length !== incoming.groups.length) {
    return { ok: false, error: 'canvasState contains malformed group entries' };
  }
  if (parsed.bricks.length !== incoming.bricks.length) {
    return { ok: false, error: 'canvasState contains malformed brick entries' };
  }
  return {
    ok: true,
    value: {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: o.exportedAt,
      title: o.title,
      canvasState: parsed,
    },
  };
}
