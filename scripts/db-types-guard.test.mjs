import { describe, expect, it } from 'vitest';

import {
  BASELINE_PREMIUM_TABLES,
  extractTypesBlock,
  findLeakedTables,
  overlayAppliedInCheckout,
  premiumTableNamesFromSql,
} from './db-types-guard.mjs';

describe('db-types-guard', () => {
  describe('overlayAppliedInCheckout', () => {
    it('is false for the open-core stub, which re-exports the client subpath', () => {
      expect(overlayAppliedInCheckout("export * from '@brickthink/premium/client';")).toBe(false);
    });

    it('is true for the real overlay impl, which imports only the bare package', () => {
      expect(overlayAppliedInCheckout("import type { X } from '@brickthink/premium';")).toBe(true);
    });

    it('is false when the stub file is absent (nothing to judge)', () => {
      expect(overlayAppliedInCheckout(null)).toBe(false);
    });
  });

  describe('premiumTableNamesFromSql', () => {
    it('reads both create-table spellings, deduped and sorted', () => {
      const names = premiumTableNamesFromSql([
        'create table if not exists public.brand_profiles (id uuid);',
        'CREATE TABLE public.session_reports (\n  id uuid\n);',
        'create table if not exists public.brand_profiles (dup);',
        'alter table public.profiles add column x text;', // not a create
      ]);
      expect(names).toEqual(['brand_profiles', 'session_reports']);
    });
  });

  describe('findLeakedTables', () => {
    const generated = [
      'export type Database = {',
      '  public: {',
      '    Tables: {',
      '      organisations: {',
      '        Row: { id: string }',
      '      }',
      '      session_reports: {',
      '        Row: { id: string }',
      '      }',
      '    }',
      '  }',
      '}',
    ].join('\n');

    it('reports premium tables present as Tables entries', () => {
      expect(findLeakedTables(generated, ['session_reports', 'brand_profiles'])).toEqual([
        'session_reports',
      ]);
    });

    it('does not false-positive on a name that merely appears in a column or comment', () => {
      const clean = generated.replace(
        '      session_reports: {\n        Row: { id: string }\n      }\n',
        '      notifications: {\n        Row: { session_reports_count: number }\n      }\n',
      );
      expect(findLeakedTables(clean, ['session_reports'])).toEqual([]);
    });

    it('is empty for a clean core generation', () => {
      expect(findLeakedTables(generated, ['brand_profiles'])).toEqual([]);
    });
  });

  describe('extractTypesBlock', () => {
    it('keeps only the export…as-const block, like the old sed pipeline', () => {
      const raw =
        'noise before\nexport type Database = {\n  x: 1\n}\nexport const Constants = {\n} as const\ntrailing noise\n';
      expect(extractTypesBlock(raw)).toBe(
        'export type Database = {\n  x: 1\n}\nexport const Constants = {\n} as const\n',
      );
    });
  });

  it('baseline covers the known premium tables so the guard works without the premium checkout', () => {
    for (const t of ['facilitator_subscriptions', 'session_reports', 'chat_conversations']) {
      expect(BASELINE_PREMIUM_TABLES).toContain(t);
    }
  });
});
