// Runs after `next build` (as the `postbuild` script). Completes the
// `output: 'standalone'` bundle so `node .next/standalone/server.js` can serve
// the app without the full node_modules tree — the slimmer runtime that keeps
// the Railway web service's memory (and bill) down.
//
// Next deliberately leaves static assets out of the standalone folder, and its
// server.js chdir()s into that folder on boot, so anything server code reads
// from disk via `process.cwd()` must also be copied in. Missing directories are
// skipped, so the list can name assets that only exist in some builds.
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STANDALONE = '.next/standalone';

// [source, destination inside STANDALONE]
const COPIES = [
  ['.next/static', '.next/static'],
  ['public', 'public'],
  // Read at runtime via process.cwd() by server code (email HTML, PDF fonts).
  ['supabase/email-templates', 'supabase/email-templates'],
  ['lib/reports/pdf/fonts', 'lib/reports/pdf/fonts'],
];

if (!existsSync(STANDALONE)) {
  console.error(`[prepare-standalone] ${STANDALONE} not found — is output: 'standalone' set?`);
  process.exit(1);
}

for (const [from, to] of COPIES) {
  if (!existsSync(from)) continue;
  cpSync(from, join(STANDALONE, to), { recursive: true });
  console.log(`[prepare-standalone] copied ${from}`);
}
