import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pure: turn the package's overlay manifest into absolute src→dest copy ops. */
export function resolveOverlayPlan(overlayFiles, opts = {}) {
  const repoRoot = opts.repoRoot ?? process.cwd();
  // Defer resolving packageDir until it is actually needed so that the
  // import.meta.resolve call is never executed when overlayFiles is empty
  // (or when opts.packageDir is supplied explicitly, as in unit tests).
  let _packageDir;
  const getPackageDir = () => {
    if (_packageDir === undefined) {
      _packageDir =
        opts.packageDir ?? dirname(fileURLToPath(import.meta.resolve('@brickthink/premium')));
    }
    return _packageDir;
  };
  return overlayFiles.map((f) => ({
    src: join(getPackageDir(), f.from),
    dest: resolve(repoRoot, f.to),
  }));
}

async function main() {
  const { overlayFiles } = await import('@brickthink/premium/overlay');
  const plan = resolveOverlayPlan(overlayFiles);
  for (const { src, dest } of plan) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`overlay: ${src} -> ${dest}`);
  }
  console.log(`overlay: ${plan.length} file(s) applied`);
}

// Run only when invoked directly, not when imported by the test.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
