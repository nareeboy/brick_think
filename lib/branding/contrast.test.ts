import { describe, expect, it } from 'vitest';

import { inkOn, relativeLuminance } from './contrast';

describe('contrast', () => {
  it('white is fully luminous, black is zero', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('picks black ink on a light brand colour', () => {
    expect(inkOn('#fde047')).toBe('#000000'); // bright yellow
  });

  it('picks white ink on a dark brand colour', () => {
    expect(inkOn('#1d4ed8')).toBe('#ffffff'); // deep blue
    expect(inkOn('#1f1f1f')).toBe('#ffffff'); // near-black
  });
});
