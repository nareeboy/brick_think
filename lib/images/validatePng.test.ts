import { describe, expect, it } from 'vitest';

import { isPng } from './validatePng';

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function blobFrom(bytes: Uint8Array, type = 'image/png'): Blob {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type });
}

describe('isPng', () => {
  it('returns true for a buffer starting with the PNG magic bytes', async () => {
    const body = new Uint8Array(64);
    body.set(PNG_MAGIC, 0);
    expect(await isPng(blobFrom(body))).toBe(true);
  });

  it('returns false for an arbitrary text blob', async () => {
    expect(await isPng(blobFrom(new TextEncoder().encode('not a png')))).toBe(false);
  });

  it('returns false for a blob smaller than 8 bytes', async () => {
    expect(await isPng(blobFrom(new Uint8Array(4)))).toBe(false);
  });

  it('returns false when the first byte is wrong even if the rest matches', async () => {
    const body = new Uint8Array(PNG_MAGIC);
    body[0] = 0x00;
    expect(await isPng(blobFrom(body))).toBe(false);
  });
});
