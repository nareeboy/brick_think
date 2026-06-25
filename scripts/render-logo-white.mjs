// White-variant logo rasteriser. Same geometry as render-logo.mjs (the
// BrickGlyph navbar mark) but the brick body is white instead of terracotta,
// so it reads cleanly on a black / dark background. Rendered against a
// transparent background — drop onto black or any dark surface.
//
// Outputs are written with a `-white` suffix so they sit alongside the
// terracotta brand assets without clobbering them.

import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const outputs = [
  { px: 1024, paths: ['public/brand/brickthink-icon-white-1024.png'] },
  { px: 512, paths: ['public/brand/brickthink-icon-white-512.png'] },
  { px: 192, paths: ['public/brand/brickthink-icon-white-192.png'] },
  { px: 180, paths: ['public/brand/brickthink-icon-white-180.png'] },
  { px: 64, paths: ['public/brand/brickthink-icon-white-64.png'] },
];

// The original CSS is 28x28; scale to N px with 80% inner fill so the icon
// has breathing room (matches the terracotta asset convention).
function html(px) {
  const brick = Math.round(px * 0.8);
  const radius = Math.round(brick * (6 / 28));
  const dotSize = Math.round(brick * (1.5 / 28) * 4);
  const dotTop = Math.round(brick * (1.5 / 28) * 4);
  const leftCx = Math.round(brick * (14 / 28));
  const rightCx = Math.round(brick * (21 / 28));
  return `<!doctype html>
<html>
<head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { width: ${px}px; height: ${px}px; display: flex; align-items: center; justify-content: center; }
  .brick {
    position: relative;
    width: ${brick}px;
    height: ${brick}px;
    background: #ffffff;
    border-radius: ${radius}px;
    /* Subtle dark inset edge for definition on dark backgrounds, plus a soft
       top shade so the white surface still reads as a brick rather than a flat tile. */
    box-shadow:
      inset 0 0 0 ${Math.max(1, Math.round(brick / 28))}px rgba(0, 0, 0, 0.12),
      inset 0 ${Math.max(2, Math.round((brick / 28) * 2))}px 0 rgba(0, 0, 0, 0.05);
  }
  .dot {
    position: absolute;
    top: ${dotTop}px;
    width: ${dotSize}px;
    height: ${dotSize}px;
    border-radius: 9999px;
    /* Darker studs so the brick texture stays visible against a white body. */
    background: rgba(0, 0, 0, 0.28);
  }
  .dot.left  { left: ${leftCx}px;  transform: translateX(-50%); }
  .dot.right { left: ${rightCx}px; transform: translateX(-50%); }
</style>
</head>
<body>
  <div class="brick">
    <div class="dot left"></div>
    <div class="dot right"></div>
  </div>
</body>
</html>`;
}

const browser = await chromium.launch();
try {
  for (const { px, paths } of outputs) {
    const ctx = await browser.newContext({
      viewport: { width: px, height: px },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(html(px));
    const buf = await page.screenshot({ omitBackground: true, type: 'png' });
    for (const out of paths) {
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, buf);
      // eslint-disable-next-line no-console -- intentional status output for a manually-run build script
      console.log(`wrote ${out} (${buf.length} bytes)`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
