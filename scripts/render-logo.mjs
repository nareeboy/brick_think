// One-off logo rasteriser. Renders the BrickGlyph (which lives inline in
// app/page.tsx, app/sign-in/page.tsx, app/privacy/page.tsx, app/terms/page.tsx)
// at the requested sizes against a transparent background so the PNGs are
// pixel-identical to the in-app navbar mark.

import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const sizes = [
  { name: 'brickthink-icon-512.png', px: 512 },
  { name: 'brickthink-icon-1024.png', px: 1024 },
  { name: 'brickthink-icon-192.png', px: 192 },
  { name: 'brickthink-icon-64.png', px: 64 },
];

// The original CSS is 28x28; scale to N px with 80% inner fill so the icon
// has breathing room (matches typical app-icon convention rather than the
// edge-to-edge navbar treatment).
function html(px) {
  const brick = Math.round(px * 0.8);
  const radius = Math.round(brick * (6 / 28));
  const dotSize = Math.round(brick * (1.5 / 28) * 4);
  const dotTop = Math.round(brick * (1.5 / 28) * 4);
  // Two dot positions match the BrickGlyph CSS:
  //   left dot:  centre x at 14/28 of brick width
  //   right dot: right edge at 24/28 of brick width
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
    background: #c0613d;
    border-radius: ${radius}px;
    box-shadow:
      inset 0 0 0 ${Math.max(1, Math.round(brick / 28))}px rgba(0, 0, 0, 0.18),
      inset 0 ${Math.max(2, Math.round((brick / 28) * 2))}px 0 rgba(255, 255, 255, 0.4);
  }
  .dot {
    position: absolute;
    top: ${dotTop}px;
    width: ${dotSize}px;
    height: ${dotSize}px;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.2);
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
  for (const { name, px } of sizes) {
    const ctx = await browser.newContext({
      viewport: { width: px, height: px },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(html(px));
    const buf = await page.screenshot({ omitBackground: true, type: 'png' });
    const out = `public/brand/${name}`;
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buf);
    await ctx.close();
    console.log(`wrote ${out} (${buf.length} bytes)`);
  }
} finally {
  await browser.close();
}
