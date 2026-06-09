import { describe, expect, it } from 'vitest';

import { buildCsp, parseFrameAncestors, shouldSendXFrameOptionsDeny } from './csp';

describe('parseFrameAncestors', () => {
  it('returns an empty list when unset', () => {
    expect(parseFrameAncestors(undefined)).toEqual([]);
    expect(parseFrameAncestors(null)).toEqual([]);
    expect(parseFrameAncestors('')).toEqual([]);
    expect(parseFrameAncestors('   ')).toEqual([]);
  });

  it('splits on whitespace and commas and trims', () => {
    expect(parseFrameAncestors('https://a.com https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(parseFrameAncestors('https://a.com, https://b.com')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
    expect(parseFrameAncestors('  https://a.com ,,  https://b.com  ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('passes wildcard sources through', () => {
    expect(parseFrameAncestors('*')).toEqual(['*']);
    expect(parseFrameAncestors('https://*.workadventu.re')).toEqual(['https://*.workadventu.re']);
  });
});

describe('buildCsp', () => {
  it('denies framing when no embedder is configured', () => {
    expect(buildCsp(undefined)).toBe("frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  });

  it("allows 'self' plus configured embedders", () => {
    expect(buildCsp('https://*.workadventu.re https://workadventu.re')).toBe(
      "frame-ancestors 'self' https://*.workadventu.re https://workadventu.re; base-uri 'self'; object-src 'none'",
    );
  });

  it('supports a wildcard to allow any embedder', () => {
    expect(buildCsp('*')).toBe("frame-ancestors 'self' *; base-uri 'self'; object-src 'none'");
  });
});

describe('shouldSendXFrameOptionsDeny', () => {
  it('keeps DENY only when no embedder is configured', () => {
    expect(shouldSendXFrameOptionsDeny(undefined)).toBe(true);
    expect(shouldSendXFrameOptionsDeny('')).toBe(true);
  });

  it('drops the header once any embedder is allow-listed', () => {
    expect(shouldSendXFrameOptionsDeny('https://*.workadventu.re')).toBe(false);
    expect(shouldSendXFrameOptionsDeny('*')).toBe(false);
  });
});
