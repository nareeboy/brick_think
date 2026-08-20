import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures';

// The /app/my-designs grid splits its cards into two labelled bands —
// "Personal designs" and "From workshops" — so the scope of a design is
// readable from the page structure rather than a per-card chip. The workshop
// band carries the only explanation the user gets for why those cards have no
// trash action: session-scoped models are hard-deleted by the FK cascade from
// stages, so the workshop (or its session) is the only lever.
//
// Grouping itself is unit-tested (lib/my-designs/types.test.ts,
// app/(authed)/app/my-designs/DesignList.test.tsx); this spec pins the real
// DOM: both bands present, ordered, and a11y-clean with content in them.

test.describe('my-designs grouping', () => {
  test('separates personal from workshop designs and explains the delete rule', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // 1. A personal design via the wizard.
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('new-design-dialog').waitFor();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const personalId = page.url().match(/\/app\/designs\/([0-9a-f-]+)/)?.[1] ?? '';
    expect(personalId).not.toBe('');

    // 2. Send a copy into the seeded session — that copy is session-scoped,
    //    i.e. a workshop design.
    await page.goto('/app/my-designs');
    await page.getByTestId(`send-${personalId}`).click();
    await page.getByTestId('send-to-session-dialog').waitFor();
    await page.getByTestId(`send-org-${seededSession.orgId}`).click();
    await page.getByTestId(`send-session-${seededSession.sessionId}`).click();
    await page.waitForURL(new RegExp(`/app/designs/(?!${personalId})[0-9a-f-]+`));
    const workshopId = page.url().match(/\/app\/designs\/([0-9a-f-]+)/)?.[1] ?? '';
    expect(workshopId).not.toBe('');

    await page.goto('/app/my-designs');

    // 3. Both bands render, personal first.
    const personalSection = page.getByTestId('design-group-personal');
    const workshopSection = page.getByTestId('design-group-workshop');
    await expect(personalSection).toBeVisible();
    await expect(workshopSection).toBeVisible();
    await expect(page.getByRole('heading', { name: /personal designs/i, level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /from workshops/i, level: 2 })).toBeVisible();

    const sectionIds = await page
      .locator('[data-testid="my-designs-list"] > section')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
    expect(sectionIds).toEqual(['design-group-personal', 'design-group-workshop']);

    // 4. Each card sits under the right heading.
    await expect(personalSection.getByTestId(`design-card-${personalId}`)).toBeVisible();
    await expect(workshopSection.getByTestId(`design-card-${workshopId}`)).toBeVisible();

    // 5. The workshop band spells out the delete rule; the personal one has
    //    nothing to explain.
    await expect(page.getByTestId('design-group-workshop-note')).toContainText(
      /only be deleted when their workshop or session is deleted/i,
    );
    await expect(page.getByTestId('design-group-personal-note')).toHaveCount(0);

    // 6. Which matches the actual affordances: only personal cards can be trashed.
    await expect(personalSection.getByRole('button', { name: /^Delete / })).toHaveCount(1);
    await expect(workshopSection.getByRole('button', { name: /^Delete / })).toHaveCount(0);
  });

  test('a populated grid stays axe-clean', async ({ signedInPage: page, seededSession }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('new-design-dialog').waitFor();
    await page.getByTestId('destination-personal').click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const personalId = page.url().match(/\/app\/designs\/([0-9a-f-]+)/)?.[1] ?? '';

    await page.goto('/app/my-designs');
    await page.getByTestId(`send-${personalId}`).click();
    await page.getByTestId('send-to-session-dialog').waitFor();
    await page.getByTestId(`send-org-${seededSession.orgId}`).click();
    await page.getByTestId(`send-session-${seededSession.sessionId}`).click();
    await page.waitForURL(new RegExp(`/app/designs/(?!${personalId})[0-9a-f-]+`));

    await page.goto('/app/my-designs');
    await page.getByTestId('design-group-workshop').waitFor();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) })),
    ).toEqual([]);
  });
});
