import { describe, it, expect } from 'vitest';

import { extractColorFromCode } from './color-from-code';

describe('extractColorFromCode', () => {
  it('extracts red from block-red-medium-left', () => {
    expect(extractColorFromCode('block-red-medium-left')).toBe('red');
  });

  it('returns empty string for window-arched-1x2 (no colour token)', () => {
    expect(extractColorFromCode('window-arched-1x2')).toBe('');
  });

  it('returns empty string for connector-bracket (no colour token)', () => {
    expect(extractColorFromCode('connector-bracket')).toBe('');
  });

  it('extracts green from block-green-medium-right', () => {
    expect(extractColorFromCode('block-green-medium-right')).toBe('green');
  });

  it('extracts navy from block-navy-medium-left', () => {
    expect(extractColorFromCode('block-navy-medium-left')).toBe('navy');
  });

  it('returns empty string for an empty string', () => {
    expect(extractColorFromCode('')).toBe('');
  });

  it('extracts color when code ends with colour token', () => {
    expect(extractColorFromCode('something-red')).toBe('red');
  });

  it('extracts color when code starts with colour token', () => {
    expect(extractColorFromCode('red-brick')).toBe('red');
  });
});
