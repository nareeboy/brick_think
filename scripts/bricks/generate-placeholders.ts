import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT, type BrickDefinition } from '@/lib/bricks/types';

const RAW_DIR = join(process.cwd(), 'assets', 'bricks-raw');

function viewBoxFor(def: BrickDefinition): string {
  const w = def.studsX * BRICK_BASE_UNIT;
  const h = def.studsY * BRICK_BASE_UNIT;
  return `0 0 ${w} ${h}`;
}

function renderPlaceholder(def: BrickDefinition): string {
  const w = def.studsX * BRICK_BASE_UNIT;
  const h = def.studsY * BRICK_BASE_UNIT;
  const studs: string[] = [];
  for (let x = 0; x < def.studsX; x += 1) {
    for (let y = 0; y < def.studsY; y += 1) {
      const cx = x * BRICK_BASE_UNIT + BRICK_BASE_UNIT / 2;
      const cy = y * BRICK_BASE_UNIT + BRICK_BASE_UNIT / 2;
      studs.push(
        `<circle cx="${cx}" cy="${cy}" r="3" fill="${def.defaultColour}" stroke="#1f1f1f" stroke-width="0.4" stroke-opacity="0.35"/>`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxFor(def)}" data-brick-code="${def.code}" data-brick-category="${def.category}">`,
    `  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="2" ry="2" fill="${def.defaultColour}" stroke="#1f1f1f" stroke-width="0.6" stroke-opacity="0.4"/>`,
    ...studs.map((s) => `  ${s}`),
    `</svg>`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  await mkdir(RAW_DIR, { recursive: true });
  const existing = new Set((await readdir(RAW_DIR)).filter((f) => f.endsWith('.svg')));

  let written = 0;
  let skipped = 0;
  for (const def of CANONICAL_BRICKS) {
    const filename = `${def.code}.svg`;
    if (existing.has(filename) && !force) {
      skipped += 1;
      continue;
    }
    await writeFile(join(RAW_DIR, filename), renderPlaceholder(def), 'utf8');
    written += 1;
  }

  console.warn(
    `Placeholder bricks: wrote ${written}, skipped ${skipped} (existing). Pass --force to overwrite.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
