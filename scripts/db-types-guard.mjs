// Refuses `pnpm db:types` while the premium overlay is applied in this
// checkout. Regenerating then would write the premium tables (billing, brand
// profiles, session reports, webhooks, …) into the TRACKED open-core
// lib/db/types.generated.ts — the most likely accidental premium-leak vector,
// since the pre-commit guard only sees it once the damage is staged.
//
// Overlay detection mirrors .git/hooks/pre-commit: the open-core stub
// lib/premium/client.tsx re-exports the `@brickthink/premium/client` SUBPATH;
// the real overlay impl does not (it imports the bare package for types only).
import { existsSync, readFileSync } from 'node:fs';

const stub = 'lib/premium/client.tsx';
if (existsSync(stub) && !readFileSync(stub, 'utf8').includes('@brickthink/premium/client')) {
  console.error('[db:types] REFUSING: the premium overlay is applied in this checkout.');
  console.error('[db:types] Regenerating now would leak premium tables into the tracked');
  console.error('[db:types] lib/db/types.generated.ts. Run `pnpm premium:off` first —');
  console.error("[db:types] the overlay's own types are regenerated in brick_think-premium.");
  process.exit(1);
}
