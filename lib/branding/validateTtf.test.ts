import { describe, expect, it } from 'vitest';

import { isTtf } from './validateTtf';

function blobFromBytes(bytes: number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe('isTtf', () => {
  it('accepts a 0x00010000 sfnt header', async () => {
    expect(await isTtf(blobFromBytes([0x00, 0x01, 0x00, 0x00, 0x00]))).toBe(true);
  });

  it("accepts a 'true' header", async () => {
    expect(await isTtf(blobFromBytes([0x74, 0x72, 0x75, 0x65, 0x00]))).toBe(true);
  });

  it("rejects an 'OTTO' (OpenType/CFF) header", async () => {
    expect(await isTtf(blobFromBytes([0x4f, 0x54, 0x54, 0x4f, 0x00]))).toBe(false);
  });

  it('rejects a WOFF2 header', async () => {
    expect(await isTtf(blobFromBytes([0x77, 0x4f, 0x46, 0x32]))).toBe(false);
  });

  it('rejects a too-short file', async () => {
    expect(await isTtf(blobFromBytes([0x00]))).toBe(false);
  });
});
