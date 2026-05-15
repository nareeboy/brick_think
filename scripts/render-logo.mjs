// One-off logo rasteriser. Renders the BrickGlyph (which lives inline in
// app/page.tsx, app/sign-in/page.tsx, app/privacy/page.tsx, app/terms/page.tsx)
// at the requested sizes against a transparent background so the PNGs are
// pixel-identical to the in-app navbar mark.

import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Each entry is rasterised once and written to all listed paths. App-router
// favicon conventions (app/icon.png, app/apple-icon.png) are written from
// the same pixel-buffer as the public/brand/* assets so they stay in lock
// step on a re-run.
const outputs = [
  {
    px: 1024,
    paths: ['public/brand/brickthink-icon-1024.png'],
  },
  {
    px: 512,
    paths: ['public/brand/brickthink-icon-512.png'],
  },
  {
    // 192 is the canonical favicon size for modern browsers and Android
    // Chrome (PWA add-to-home-screen). Also written to app/icon.png where
    // Next.js App Router picks it up automatically and injects
    // <link rel="icon" type="image/png" sizes="192x192" href="/icon">.
    px: 192,
    paths: ['public/brand/brickthink-icon-192.png', 'app/icon.png'],
  },
  {
    // 180 is the iOS home-screen size. Next.js picks app/apple-icon.png
    // up automatically and injects <link rel="apple-touch-icon" …>.
    // iOS clips to a rounded rectangle and composites onto a white
    // background — transparent BG is fine.
    px: 180,
    paths: ['public/brand/brickthink-icon-180.png', 'app/apple-icon.png'],
  },
  {
    px: 64,
    paths: ['public/brand/brickthink-icon-64.png'],
  },
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
