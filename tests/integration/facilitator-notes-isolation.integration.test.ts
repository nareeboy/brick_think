import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ALLOWLIST = new Set<string>([
  'lib/sessions/facilitatorNotes.ts',
  'app/(authed)/app/sessions/notes-actions.ts',
  'components/session/NotesEditor.tsx',
  'app/(authed)/app/sessions/[id]/FacilitatorNotesCard.tsx',
  'components/session/FacilitatorNotesDrawer.tsx',
]);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.'))
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('facilitator_notes column isolation', () => {
  it('only allowlisted files reference the column literal', async () => {
    const root = process.cwd();
    const files = await walk(root);
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(root, file);
      if (rel.startsWith('tests/')) continue;
      // e2e specs are test code (like tests/), not production paths that could
      // leak the column — they reference the literal only in prose/assertions.
      if (rel.startsWith('e2e/')) continue;
      if (rel.startsWith('lib/db/types.generated.ts')) continue;
      if (rel.startsWith('supabase/migrations/')) continue;
      if (rel.startsWith('docs/')) continue;
      if (rel.startsWith('.claude/')) continue;
      if (ALLOWLIST.has(rel)) continue;
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('facilitator_notes')) offenders.push(rel);
    }
    expect(
      offenders,
      `Unexpected facilitator_notes references; either add to ALLOWLIST or remove:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
