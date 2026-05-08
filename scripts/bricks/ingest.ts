import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { findCanonicalBrick } from '@/lib/bricks/canonical';
import {
  BRICK_BASE_UNIT,
  type BrickCategory,
  type BrickDefinition,
  type BrickManifest,
  type BrickManifestEntry,
} from '@/lib/bricks/types';

const RAW_DIR = join(process.cwd(), 'assets', 'bricks-raw');
const OUT_DIR = join(process.cwd(), 'public', 'bricks');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');

const FILL_PATTERN = /fill="([^"]+)"/g;
const VIEWBOX_PATTERN = /viewBox="([^"]+)"/;
const SVG_OPEN_TAG = /<svg([^>]*)>/;
const XMLNS_PRESENT = /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/;
const DATA_BRICK_CODE_ATTR = /\s+data-brick-code="[^"]*"/;

function resolveDefinition(code: string): BrickDefinition {
  const canonical = findCanonicalBrick(code);
  if (canonical) return canonical;

  const dimMatch = /(\d+)x(\d+)$/.exec(code);
  const studsX = dimMatch ? Number.parseInt(dimMatch[1] ?? '1', 10) : 1;
  const studsY = dimMatch ? Number.parseInt(dimMatch[2] ?? '1', 10) : 1;
  const category: BrickCategory = 'specialty';
  return {
    code,
    name: code,
    category,
    studsX,
    studsY,
    defaultColour: '#525c69',
  };
}

export interface TransformResult {
  svg: string;
  viewBox: string;
}

export function transformSvg(content: string, def: BrickDefinition): TransformResult {
  let svg = content;

  // Replace fill colours with a CSS variable, keeping the original as the fallback so
  // bricks render their semantic default when no override is set.
  svg = svg.replace(FILL_PATTERN, (match, value: string) => {
    if (value === 'none' || value === 'transparent') return match;
    if (value.startsWith('var(')) return match;
    return `fill="var(--brick-fill, ${value})"`;
  });

  // Ensure xmlns is present.
  if (!XMLNS_PRESENT.test(svg)) {
    svg = svg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Ensure viewBox is set; fall back to the canonical dimensions in baseUnit space.
  let viewBox: string;
  const viewBoxMatch = VIEWBOX_PATTERN.exec(svg);
  if (viewBoxMatch?.[1]) {
    viewBox = viewBoxMatch[1];
  } else {
    viewBox = `0 0 ${def.studsX * BRICK_BASE_UNIT} ${def.studsY * BRICK_BASE_UNIT}`;
    svg = svg.replace(SVG_OPEN_TAG, `<svg$1 viewBox="${viewBox}">`);
  }

  // Normalise data-brick-code so the runtime can identify each tile.
  svg = svg.replace(DATA_BRICK_CODE_ATTR, '');
  svg = svg.replace(SVG_OPEN_TAG, `<svg$1 data-brick-code="${def.code}">`);

  return { svg, viewBox };
}

function sha256Hash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

async function listRawSvgs(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Brick raw directory missing: ${dir}. Run pnpm bricks:placeholders to bootstrap, or drop real SVGs there.`,
      );
    }
    throw err;
  }
  return entries.filter((name) => name.endsWith('.svg')).sort();
}

async function clearOutputDirectory(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

export async function ingest(): Promise<BrickManifest> {
  const rawFiles = await listRawSvgs(RAW_DIR);
  if (rawFiles.length === 0) {
    throw new Error(
      `No SVGs found in ${RAW_DIR}. Drop assets there or run pnpm bricks:placeholders.`,
    );
  }

  await clearOutputDirectory(OUT_DIR);

  const entries: BrickManifestEntry[] = [];

  for (const filename of rawFiles) {
    const code = basename(filename, '.svg');
    const def = resolveDefinition(code);
    const raw = await readFile(join(RAW_DIR, filename), 'utf8');
    const { svg, viewBox } = transformSvg(raw, def);

    const outPath = join(OUT_DIR, `${code}.svg`);
    await writeFile(outPath, svg, 'utf8');

    entries.push({
      ...def,
      viewBox,
      path: `/bricks/${code}.svg`,
      hash: sha256Hash(svg),
    });
  }

  const manifest: BrickManifest = {
    version: 1,
    ingestedAt: new Date().toISOString(),
    baseUnit: BRICK_BASE_UNIT,
    count: entries.length,
    bricks: entries,
  };

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return manifest;
}

async function main(): Promise<void> {
  const manifest = await ingest();
  console.warn(`Ingested ${manifest.count} bricks. Manifest at ${MANIFEST_PATH}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
