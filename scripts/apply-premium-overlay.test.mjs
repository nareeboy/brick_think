import { describe, expect, it } from 'vitest';

import { resolveOverlayPlan } from './apply-premium-overlay.mjs';

describe('apply-premium-overlay', () => {
  it('produces an empty copy plan when the package ships no overlay files', () => {
    expect(resolveOverlayPlan([])).toEqual([]);
  });

  it('maps overlay entries to absolute copy operations under the repo root', () => {
    const plan = resolveOverlayPlan(
      [{ from: 'overlay/app/api/x/route.ts', to: 'app/api/x/route.ts' }],
      { repoRoot: '/repo', packageDir: '/pkg' },
    );
    expect(plan).toEqual([
      { src: '/pkg/overlay/app/api/x/route.ts', dest: '/repo/app/api/x/route.ts' },
    ]);
  });
});
