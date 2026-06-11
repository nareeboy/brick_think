// Local-dev only: toggle the private @brickthink/premium overlay in THIS checkout
// so you can run the paid build with `pnpm dev:e2e` (or `pnpm dev:premium`).
//
//   pnpm premium:on    apply the overlay  (then `pnpm install` — see package.json)
//   pnpm premium:off   remove the overlay (then `pnpm install`)
//
// Reads the overlay from a LOCAL clone of the private repo — default
// ../brick_think-premium, override with PREMIUM_LOCAL_REPO. This is NOT how the
// platform applies the overlay (Railway uses scripts/bootstrap-premium.mjs with a
// PAT); this is a developer convenience that copies from a clone you already have.
//
// NEVER commit while the overlay is applied — the pre-commit guard blocks it.
// Run `pnpm premium:off` before committing open-core work.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2];
if (mode !== 'apply' && mode !== 'clean') {
  console.error('usage: node scripts/premium-local.mjs <apply|clean>');
  process.exit(1);
}

const repoRoot = process.cwd();
const premium = resolve(repoRoot, process.env.PREMIUM_LOCAL_REPO || '../brick_think-premium');
if (!existsSync(join(premium, 'manifest.mjs'))) {
  console.error(`[premium-local] no private overlay clone at: ${premium}`);
  console.error('[premium-local] clone brick_think-premium there, or set PREMIUM_LOCAL_REPO.');
  process.exit(1);
}

const { overlayFiles } = await import(pathToFileURL(join(premium, 'manifest.mjs')).href);

// Files that also exist as committed open-core files (stub wrappers / generated
// types) — restored via git on clean, never deleted.
const DUAL = new Set(['lib/premium/client.tsx', 'lib/premium/server.ts', 'lib/db/types.generated.ts']);

if (mode === 'apply') {
  for (const { from, to } of overlayFiles) {
    const dest = join(repoRoot, to);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(premium, from), dest);
  }
  const premPkg = JSON.parse(readFileSync(join(premium, 'package.json'), 'utf8'));
  const corePath = join(repoRoot, 'package.json');
  const core = JSON.parse(readFileSync(corePath, 'utf8'));
  const deps = premPkg.dependencies ?? {};
  core.dependencies = { ...core.dependencies, ...deps };
  writeFileSync(corePath, `${JSON.stringify(core, null, 2)}\n`);
  console.log(`[premium-local] applied ${overlayFiles.length} overlay files + deps: ${Object.keys(deps).join(', ')}`);
} else {
  // clean: remove premium-only files, then restore the dual tracked files +
  // package manifests from git (this is why the tooling must be committed —
  // `git checkout package.json` would otherwise wipe uncommitted script edits).
  const touched = new Set();
  for (const { to } of overlayFiles) {
    if (DUAL.has(to)) continue;
    const abs = join(repoRoot, to);
    if (existsSync(abs)) {
      rmSync(abs);
      touched.add(dirname(abs));
    }
  }
  for (let d of [...touched].sort((a, b) => b.length - a.length)) {
    while (d.startsWith(repoRoot) && d !== repoRoot) {
      try {
        if (readdirSync(d).length === 0) {
          rmdirSync(d);
          d = dirname(d);
        } else break;
      } catch {
        break;
      }
    }
  }
  execFileSync(
    'git',
    ['checkout', '--', 'lib/premium/server.ts', 'lib/premium/client.tsx', 'lib/db/types.generated.ts', 'package.json', 'pnpm-lock.yaml'],
    { cwd: repoRoot, stdio: 'inherit' },
  );
  console.log('[premium-local] removed overlay + restored open-core stubs.');
}
