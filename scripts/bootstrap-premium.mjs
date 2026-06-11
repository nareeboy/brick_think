// Platform-only: pull the private @brickthink/premium overlay onto the open core
// BEFORE install/build, so the hosted build ships the paid features.
//
// Inert by default: with no PREMIUM_OVERLAY_TOKEN/REPO set (self-host, local dev,
// CI of the OSS repo) it prints a notice and exits 0 — the OSS build is untouched.
//
// On the platform (Railway prod/staging) it: shallow-clones the private overlay
// repo with a read-only PAT, copies every file in its manifest into this checkout
// (restoring lib/reports, lib/branding, lib/billing, the account billing/branding
// pages, the Stripe webhook, the pricing page, the full-schema db types, the 7
// premium migrations, and the REAL lib/premium/{server,client} seam wrappers), and
// merges the overlay's runtime deps (@anthropic-ai/sdk, @react-pdf/renderer, stripe)
// into package.json so the following `pnpm install` pulls them.
//
// If the token IS set but anything fails, it aborts with a non-zero exit so the
// build fails loudly rather than silently shipping the free OSS product.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const token = process.env.PREMIUM_OVERLAY_TOKEN;
const repo = process.env.PREMIUM_OVERLAY_REPO;
const ref = process.env.PREMIUM_OVERLAY_REF || 'main';

if (!token || !repo) {
  console.log('[premium] PREMIUM_OVERLAY_TOKEN/REPO not set — OSS build, skipping overlay.');
  process.exit(0);
}

const repoRoot = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'premium-overlay-'));

try {
  // Inject the PAT into the HTTPS URL. Never logged.
  const authed = repo.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  if (authed === repo) throw new Error('PREMIUM_OVERLAY_REPO must be an https:// URL');

  console.log(`[premium] cloning overlay @ ${ref} …`);
  execFileSync('git', ['clone', '--depth', '1', '--branch', ref, authed, tmp], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  const { overlayFiles } = await import(pathToFileURL(join(tmp, 'manifest.mjs')).href);
  if (!Array.isArray(overlayFiles) || overlayFiles.length === 0) {
    throw new Error('overlay manifest is empty or missing');
  }
  for (const { from, to } of overlayFiles) {
    const dest = join(repoRoot, to);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(tmp, from), dest);
  }
  console.log(`[premium] applied ${overlayFiles.length} overlay files.`);

  // Merge the overlay's runtime deps into the core package.json. The workspace
  // stub `@brickthink/premium` stays as-is — it still provides the contract types
  // via node_modules; the overlay overwrote lib/premium/* with the real impls.
  const premPkg = JSON.parse(readFileSync(join(tmp, 'package.json'), 'utf8'));
  const corePkgPath = join(repoRoot, 'package.json');
  const corePkg = JSON.parse(readFileSync(corePkgPath, 'utf8'));
  const added = premPkg.dependencies ?? {};
  corePkg.dependencies = { ...corePkg.dependencies, ...added };
  writeFileSync(corePkgPath, `${JSON.stringify(corePkg, null, 2)}\n`);
  console.log(`[premium] merged deps: ${Object.keys(added).join(', ') || '(none)'}`);
  console.log('[premium] overlay bootstrap complete.');
} catch (err) {
  console.error('[premium] overlay bootstrap FAILED — aborting build to avoid shipping a free build.');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
