import { describe, it, expect } from 'vitest';

import { buildExportFilename, slugify } from './filename';

describe('slugify', () => {
  it('lowercases, replaces non-alphanumerics with hyphens, trims', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
  it('collapses multiple separators', () => {
    expect(slugify('foo   ___   bar')).toBe('foo-bar');
  });
  it('caps at 60 chars', () => {
    expect(slugify('a'.repeat(120)).length).toBe(60);
  });
  it('returns empty string for whitespace-only input', () => {
    expect(slugify('   ')).toBe('');
  });
});

describe('buildExportFilename', () => {
  it('uses slugified title + extension', () => {
    expect(buildExportFilename('Team retrospective', 'png')).toBe('team-retrospective.png');
  });
  it('falls back to "design" when title is empty', () => {
    expect(buildExportFilename('', 'svg')).toBe('design.svg');
  });
  it('preserves double extension for brickthink.json', () => {
    expect(buildExportFilename('Quarterly plan', 'brickthink.json')).toBe(
      'quarterly-plan.brickthink.json',
    );
  });
});
