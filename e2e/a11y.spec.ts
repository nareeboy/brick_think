// Baseline axe-core accessibility scans across authed routes.
//
// RATCHET: each route carries the accepted violation count (axe rules, not
// node instances) recorded 2026-08-13. A scan that comes in ABOVE its
// accepted count hard-fails — new violations can't land silently. When a
// remediation lands and a route scans lower, lower its number here too
// (ratchet down, never up).
//
// As of 2026-08-13 every route scans CLEAN (the WCAG 2.2 AA remediation
// phases landed; the LayersPanel group-row nested-interactive found when the
// ratchet was introduced was fixed the same day).

import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures';

type AxeViolations = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];

function logViolations(routeName: string, violations: AxeViolations) {
  if (violations.length === 0) return;
  console.warn(
    `\naxe violations on ${routeName} (${violations.length}):`,
    JSON.stringify(
      violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => n.target.join(' ')),
      })),
      null,
      2,
    ),
  );
}

// Routes that need no dynamic ID — navigate directly, with each route's
// accepted violation count (see RATCHET note above).
const STATIC_ROUTES = [
  { name: 'my-designs', path: '/app/my-designs', accepted: 0 },
  { name: 'workshops', path: '/app/workshops', accepted: 0 },
  { name: 'workshops/new', path: '/app/workshops/new', accepted: 0 },
  { name: 'account', path: '/app/account', accepted: 0 },
  { name: 'designs/trash', path: '/app/designs/trash', accepted: 0 },
] as const;

// Session-detail's accepted count (dynamic route, scanned separately below).
const SESSION_DETAIL_ACCEPTED = 0;

const DESIGN_BUILDER_ACCEPTED = 0;

function assertRatchet(routeName: string, accepted: number, violations: AxeViolations) {
  expect(
    violations.length,
    `axe violation count on ${routeName} exceeds the accepted baseline (${accepted}). ` +
      `New violations must be fixed, not accepted; if you fixed some, ratchet the ` +
      `baseline down in e2e/a11y.spec.ts instead.`,
  ).toBeLessThanOrEqual(accepted);
}

test.describe('axe baseline scans', () => {
  for (const route of STATIC_ROUTES) {
    test(`axe scan: ${route.name}`, async ({ signedInPage: page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();

      logViolations(route.name, results.violations);
      assertRatchet(route.name, route.accepted, results.violations);
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
    assertRatchet('session-detail', SESSION_DETAIL_ACCEPTED, results.violations);
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
    assertRatchet('design-builder', DESIGN_BUILDER_ACCEPTED, results.violations);
  });
});
