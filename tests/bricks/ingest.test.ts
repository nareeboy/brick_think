import { describe, expect, it } from 'vitest';

import { CANONICAL_BRICKS, findCanonicalBrick } from '@/lib/bricks/canonical';
import { transformSvg } from '@/scripts/bricks/ingest';

const sampleDef = findCanonicalBrick('brick-2x4')!;

describe('transformSvg', () => {
  it('rewrites fill colours into a CSS variable with the original as fallback', () => {
    const input = '<svg viewBox="0 0 32 64"><rect fill="#c0613d" /></svg>';
    const { svg } = transformSvg(input, sampleDef);
    expect(svg).toContain('fill="var(--brick-fill, #c0613d)"');
    expect(svg).not.toContain('fill="#c0613d"');
  });

  it('leaves fill="none" and fill="transparent" untouched', () => {
    const input = '<svg viewBox="0 0 32 64"><rect fill="none" /><rect fill="transparent" /></svg>';
    const { svg } = transformSvg(input, sampleDef);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('fill="transparent"');
  });

  it('does not double-wrap an existing var() fill', () => {
    const input = '<svg viewBox="0 0 32 64"><rect fill="var(--brick-fill, red)" /></svg>';
    const { svg } = transformSvg(input, sampleDef);
    const occurrences = svg.match(/var\(--brick-fill/g)?.length ?? 0;
    expect(occurrences).toBe(1);
  });

  it('adds xmlns when missing', () => {
    const input = '<svg viewBox="0 0 32 64"><rect fill="#abc" /></svg>';
    const { svg } = transformSvg(input, sampleDef);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('falls back to the canonical viewBox when none is present', () => {
    const input = '<svg><rect fill="#abc" /></svg>';
    const { svg, viewBox } = transformSvg(input, sampleDef);
    expect(viewBox).toBe('0 0 32 64');
    expect(svg).toContain('viewBox="0 0 32 64"');
  });

  it('normalises the data-brick-code attribute even if the source had a different one', () => {
    const input = '<svg viewBox="0 0 32 64" data-brick-code="wrong-code"><rect fill="#abc"/></svg>';
    const { svg } = transformSvg(input, sampleDef);
    expect(svg).toContain('data-brick-code="brick-2x4"');
    expect(svg).not.toContain('data-brick-code="wrong-code"');
  });
});

describe('CANONICAL_BRICKS', () => {
  it('contains exactly 52 entries', () => {
    expect(CANONICAL_BRICKS).toHaveLength(52);
  });

  it('has unique codes', () => {
    const codes = CANONICAL_BRICKS.map((b) => b.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has positive stud dimensions for every brick', () => {
    for (const brick of CANONICAL_BRICKS) {
      expect(brick.studsX).toBeGreaterThan(0);
      expect(brick.studsY).toBeGreaterThan(0);
    }
  });
});
