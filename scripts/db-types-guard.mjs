// `pnpm db:types` — regenerate lib/db/types.generated.ts from the LOCAL stack,
// refusing to write if the result would leak premium schema into open core.
//
// Two independent checks, because they fail in different situations:
//
// 1. CHECKOUT: is the premium overlay applied here? (lib/premium/client.tsx is
//    the real impl rather than the stub.) Mirrors .git/hooks/pre-commit: the
//    stub re-exports the `@brickthink/premium/client` SUBPATH; the real impl
//    imports only the bare package for types.
//
// 2. OUTPUT: does the generated TypeScript contain any premium TABLE? This is
//    the check that actually closes the leak. The local Supabase stack is ONE
//    shared Postgres for every worktree on the machine, so a clean open-core
//    worktree still generates against a database that may have had premium
//    migrations applied from another checkout. Check 1 passes there — and
//    without check 2, regeneration writes billing/chat/report tables into the
//    TRACKED open-core types file. That happened (nearly) on 2026-08-21.
//
// Premium table names come from the premium checkout's migrations when it is
// present (../brick_think-premium, override with PREMIUM_LOCAL_REPO) — which
// is exactly the case in which a local DB can contain premium tables — union
// a hardcoded baseline so the guard still means something without it.
//
// The generated text is held in memory and only written once it is clean; on
// refusal the tracked file is NOT touched.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Known premium tables — fallback when the premium checkout is unavailable. */
export const BASELINE_PREMIUM_TABLES = Object.freeze([
  'assistant_conversations',
  'assistant_messages',
  'assistant_promo_grants',
  'billing_admin_tier_overrides',
  'brand_profiles',
  'chat_conversations',
  'chat_messages',
  'facilitator_subscriptions',
  'session_purchases',
  'session_reports',
  'stripe_customers',
  'webhook_configs',
  'webhook_deliveries',
]);

/** True when lib/premium/client.tsx is the real overlay impl, not the stub. */
export function overlayAppliedInCheckout(stubSource) {
  if (stubSource === null || stubSource === undefined) return false;
  return !stubSource.includes('@brickthink/premium/client');
}

/** `create table [if not exists] public.<name>` across SQL texts — sorted, deduped. */
export function premiumTableNamesFromSql(sqlTexts) {
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi;
  const names = new Set();
  for (const sql of sqlTexts) {
    for (const m of sql.matchAll(re)) names.add(m[1].toLowerCase());
  }
  return [...names].sort();
}

/**
 * Premium table names that appear as Tables ENTRIES in generated output.
 * Matches the generator's exact shape (`      <name>: {` at 6-space indent)
 * so a column or comment mentioning the name is not a false positive.
 */
export function findLeakedTables(generatedTs, premiumNames) {
  const leaked = [];
  for (const name of premiumNames) {
    if (new RegExp(`^ {6}${name}: \\{$`, 'm').test(generatedTs)) leaked.push(name);
  }
  return leaked;
}

/** Same slice the previous `sed -n '/^export /,/^} as const$/p'` produced. */
export function extractTypesBlock(raw) {
  const lines = raw.split('\n');
  const start = lines.findIndex((l) => l.startsWith('export '));
  if (start === -1) return '';
  const endRel = lines.slice(start).findIndex((l) => l === '} as const');
  const end = endRel === -1 ? lines.length - 1 : start + endRel;
  return lines.slice(start, end + 1).join('\n') + '\n';
}

function premiumTableNames(repoRoot) {
  const premium = resolve(repoRoot, process.env.PREMIUM_LOCAL_REPO || '../brick_think-premium');
  const dir = resolve(premium, 'overlay/supabase/migrations');
  const names = new Set(BASELINE_PREMIUM_TABLES);
  if (existsSync(dir)) {
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(resolve(dir, f), 'utf8'));
    for (const n of premiumTableNamesFromSql(sql)) names.add(n);
  }
  return [...names].sort();
}

function main() {
  const repoRoot = resolve(fileURLToPath(import.meta.url), '../..');
  const target = resolve(repoRoot, 'lib/db/types.generated.ts');
  const stubPath = resolve(repoRoot, 'lib/premium/client.tsx');

  // Check 1 — checkout.
  const stub = existsSync(stubPath) ? readFileSync(stubPath, 'utf8') : null;
  if (overlayAppliedInCheckout(stub)) {
    console.error('[db:types] REFUSING: the premium overlay is applied in this checkout.');
    console.error('[db:types] Run `pnpm premium:off` first — the overlay regenerates its own');
    console.error('[db:types] types in brick_think-premium, not here.');
    process.exit(1);
  }

  // Generate into memory.
  const raw = execFileSync('supabase', ['gen', 'types', 'typescript', '--local'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const block = extractTypesBlock(raw);
  if (block.trim().length === 0) {
    console.error('[db:types] generator produced no export block — is the local stack running?');
    process.exit(1);
  }

  // Check 2 — output.
  const leaked = findLeakedTables(block, premiumTableNames(repoRoot));
  if (leaked.length > 0) {
    console.error('[db:types] REFUSING: the generated types contain premium tables:');
    for (const t of leaked) console.error(`[db:types]   - ${t}`);
    console.error('[db:types] Your local Supabase stack has premium migrations applied (it is');
    console.error('[db:types] shared across worktrees). Writing this would leak private schema');
    console.error('[db:types] into the tracked open-core lib/db/types.generated.ts.');
    console.error('[db:types] Either regenerate from a stack WITHOUT the premium migrations');
    console.error('[db:types] (`pnpm db:reset` — wipes local data), or hand-add only the entry');
    console.error(
      '[db:types] you need, in the generated format. The tracked file was not touched.',
    );
    process.exit(1);
  }

  writeFileSync(target, block);
  console.log(`[db:types] wrote ${target}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
