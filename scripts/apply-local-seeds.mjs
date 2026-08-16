// scripts/apply-local-seeds.mjs
//
// Applies the LOCAL-ONLY, gitignored seed files (supabase/seeds/*.sql) to the
// running local Supabase stack — always reading them from the PRIMARY checkout.
//
// Why this exists: `supabase db reset` only loads the `./seeds/*.sql` glob from
// the checkout it runs in. `supabase/seeds/` is gitignored (it holds the
// maintainer's site-admin allowlist — the repo deliberately ships no hardcoded
// admin), so the directory exists only in the primary checkout. A reset run
// from a git worktree matches nothing, silently, and leaves the shared local
// stack with an empty `site_admin_emails` allowlist. This script closes that
// gap: `pnpm db:reset` / `pnpm db:start` run it after the Supabase CLI, and it
// resolves the primary checkout via `git rev-parse --git-common-dir`, so the
// same seeds apply no matter which worktree you're in.
//
// Requirements for files in supabase/seeds/: they MUST be idempotent
// (`on conflict do nothing`, guarded updates) — on the primary checkout the
// Supabase CLI has already applied them once via the config.toml glob and this
// script applies them a second time.
//
// No seed files found (fresh clone, CI) → friendly notice, exit 0.
// Local DB unreachable → warning, exit 0 (don't break CI or stackless runs).
// A seed file failing to apply → loud error, exit 1.

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const TAG = '[local-seeds]';

function primaryCheckoutRoot() {
  // In the primary checkout this is ".git"; in a worktree it's an absolute
  // path to the primary checkout's .git directory.
  const commonDir = execSync('git rev-parse --git-common-dir', {
    encoding: 'utf8',
  }).trim();
  return path.dirname(path.resolve(commonDir));
}

const root = primaryCheckoutRoot();
const seedsDir = path.join(root, 'supabase', 'seeds');

const files = existsSync(seedsDir)
  ? readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => path.join(seedsDir, f))
  : [];

if (files.length === 0) {
  console.log(`${TAG} no local seed files found (${seedsDir}/*.sql) — skipping.`);
  process.exit(0);
}

const connectionString =
  process.env.LOCAL_SEEDS_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// `supabase db reset` restarts containers just before returning; give the DB
// a few seconds to accept connections.
let client = null;
for (let attempt = 1; attempt <= 10; attempt++) {
  const candidate = new pg.Client({ connectionString });
  try {
    await candidate.connect();
    client = candidate;
    break;
  } catch {
    await candidate.end().catch(() => {});
    if (attempt < 10) await new Promise((r) => setTimeout(r, 1000));
  }
}

if (!client) {
  console.warn(
    `${TAG} local database not reachable at ${connectionString.replace(/:[^:@/]+@/, ':***@')} — is the stack running? Skipping local seeds.`,
  );
  process.exit(0);
}

try {
  for (const file of files) {
    await client.query(readFileSync(file, 'utf8'));
    console.log(`${TAG} applied ${path.relative(root, file)}`);
  }
} catch (err) {
  console.error(`${TAG} failed to apply local seeds: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
