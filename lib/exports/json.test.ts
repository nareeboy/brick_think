import { describe, it, expect } from 'vitest';

import { parseCanvasState } from '@/lib/models/canvasState';

import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  buildExportEnvelope,
  parseExportEnvelope,
  renderEnvelopeToBlob,
} from './json';

const sampleCanvas = parseCanvasState({
  groups: [{ id: 'g1', name: 'Layer 1', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b1',
      groupId: 'g1',
      code: 'block-green-medium-left',
      image: '/bricks/block-green-medium-left.png',
      width: 180,
      height: 156,
      x: 200,
      y: 200,
      rotation: 0,
      visible: true,
    },
  ],
});

describe('buildExportEnvelope', () => {
  it('stamps format, version, and ISO timestamp', () => {
    const env = buildExportEnvelope({ title: 'Demo', canvasState: sampleCanvas });
    expect(env.format).toBe(EXPORT_FORMAT);
    expect(env.version).toBe(EXPORT_VERSION);
    expect(env.title).toBe('Demo');
    expect(env.canvasState).toEqual(sampleCanvas);
    expect(() => new Date(env.exportedAt).toISOString()).not.toThrow();
  });
});

describe('parseExportEnvelope', () => {
  it('round-trips a built envelope through JSON', () => {
    const env = buildExportEnvelope({ title: 'Demo', canvasState: sampleCanvas });
    const result = parseExportEnvelope(JSON.parse(JSON.stringify(env)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(env);
  });

  it('rejects when format is wrong', () => {
    const result = parseExportEnvelope({
      format: 'wrong',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      title: 'x',
      canvasState: { groups: [], bricks: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not a brickthink design/i);
  });

  it('rejects unsupported future versions', () => {
    const result = parseExportEnvelope({
      format: EXPORT_FORMAT,
      version: 99,
      exportedAt: '2026-01-01T00:00:00.000Z',
      title: 'x',
      canvasState: { groups: [], bricks: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported file version: 99/i);
  });

  it('rejects malformed canvas state (non-array groups)', () => {
    const result = parseExportEnvelope({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: '2026-01-01T00:00:00.000Z',
      title: 'x',
      canvasState: { groups: 'not-an-array', bricks: [] },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects when title exceeds 200 chars', () => {
    const result = parseExportEnvelope({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: '2026-01-01T00:00:00.000Z',
      title: 'a'.repeat(201),
      canvasState: { groups: [], bricks: [] },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects when a brick entry is structurally invalid', () => {
    const result = parseExportEnvelope({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: '2026-01-01T00:00:00.000Z',
      title: 'x',
      canvasState: {
        groups: [{ id: 'g1', name: 'L', collapsed: false, visible: true }],
        bricks: [{ id: 'b1', groupId: 'g1' }], // missing required fields
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe('renderEnvelopeToBlob', () => {
  it('produces a JSON blob whose body is the envelope', async () => {
    const env = buildExportEnvelope({ title: 'Demo', canvasState: sampleCanvas });
    const blob = renderEnvelopeToBlob(env);
    expect(blob.type).toBe('application/json');
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual(env);
  });
});
