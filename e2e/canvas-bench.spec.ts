import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import type { BenchResult } from '@/lib/canvas/benchHarness';

const RESULTS_PATH = join(process.cwd(), 'docs', 'decisions', 'canvas-bench-results.json');

interface AggregateResult {
  capturedAt: string;
  results: { konva: BenchResult; pixi: BenchResult };
  notes: string[];
}

async function captureBench(page: Page, url: string): Promise<BenchResult> {
  await page.goto(url);
  await page.waitForSelector('[data-testid="bench-status"]');
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="bench-status"]')?.getAttribute('data-status') ===
      'done',
    null,
    { timeout: 45_000 },
  );
  const result = await page.evaluate(() => window.__benchResult);
  if (!result) throw new Error(`No bench result captured for ${url}`);
  return result;
}

test('canvas bench captures Konva and Pixi metrics', async ({ page }) => {
  const konva = await captureBench(page, '/spike/konva/bench');
  const pixi = await captureBench(page, '/spike/pixi/bench');

  expect(konva.brickCount).toBe(2500);
  expect(pixi.brickCount).toBe(2500);
  expect(konva.fps).toBeGreaterThan(0);
  expect(pixi.fps).toBeGreaterThan(0);

  const aggregate: AggregateResult = {
    capturedAt: new Date().toISOString(),
    results: { konva, pixi },
    notes: [
      'Captured by Playwright Chromium against pnpm start (production build).',
      '2500 sprites equals 25 simulated participants times 100 bricks.',
      'Setup time excludes asset fetch warm-up since loadBrickImage caches per process.',
    ],
  };

  await mkdir(dirname(RESULTS_PATH), { recursive: true });
  await writeFile(RESULTS_PATH, `${JSON.stringify(aggregate, null, 2)}\n`, 'utf8');

  console.warn(`konva: ${konva.fps.toFixed(1)} fps, p50 ${konva.frameP50ms.toFixed(2)} ms`);
  console.warn(`pixi : ${pixi.fps.toFixed(1)} fps, p50 ${pixi.frameP50ms.toFixed(2)} ms`);
});
