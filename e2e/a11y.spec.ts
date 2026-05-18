// Baseline axe-core accessibility scans across authed routes.
// These scans are EXPECTED TO PRODUCE VIOLATIONS — the violations are the
// to-do list for Phases 1–4 of the WCAG 2.2 AA remediation. Do not try to
// make them go away here. `expect.soft` is used so a single failure doesn't
// abort the whole suite.

import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures';

type AxeViolations = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];

function logViolations(routeName: string, violations: AxeViolations) {
  if (violations.length === 0) return;
  console.warn(
    `\naxe violations on ${routeName} (${violations.length}):`,
    JSON.stringify(
      violations.map((v) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length })),
      null,
      2,
    ),
  );
}

// Routes that need no dynamic ID — navigate directly.
const STATIC_ROUTES = [
  { name: 'my-designs', path: '/app/my-designs' },
  { name: 'orgs', path: '/app/orgs' },
  { name: 'orgs/new', path: '/app/orgs/new' },
  { name: 'account', path: '/app/account' },
  { name: 'designs/trash', path: '/app/designs/trash' },
] as const;

test.describe('axe baseline scans', () => {
  for (const route of STATIC_ROUTES) {
    test(`axe scan: ${route.name}`, async ({ signedInPage: page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();

      logViolations(route.name, results.violations);
      expect.soft(results.violations, `axe violations on ${route.name}`).toEqual([]);
    });
  }

  // Session-detail route — requires a seeded session for a valid ID.
  test('axe scan: session-detail', async ({ signedInPage: page, seededSession }) => {
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    logViolations('session-detail', results.violations);
    expect.soft(results.violations, 'axe violations on session-detail').toEqual([]);
  });

  // Design-builder route — creates a personal design via the UI, then scans the
  // empty canvas. An empty canvas is a valid baseline target; Phase 1 will fix
  // the "canvas has no AT exposure" violation this surfaces.
  test('axe scan: design-builder', async ({ signedInPage: page }) => {
    await page.goto('/app/my-designs');
    await expect(page.getByRole('heading', { name: /my designs/i, level: 1 })).toBeVisible();

    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    await expect(page.getByTestId('builder-canvas')).toBeVisible();

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    logViolations('design-builder', results.violations);
    expect.soft(results.violations, 'axe violations on design-builder').toEqual([]);
  });
});
