import { test, expect } from './fixtures';

test.describe('nav restructure', () => {
  test('header has exactly two links', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    const nav = signedInPage.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link', { name: 'Organisations' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'My Designs' })).toBeVisible();
    await expect(nav.locator('a')).toHaveCount(2);
  });

  test('New Design from My Designs creates a personal design', async ({ signedInPage }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('new-design-button').click();
    await signedInPage.getByTestId('new-design-dialog').waitFor();
    await signedInPage.getByTestId('destination-personal').click();
    await signedInPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
  });

  test('New Design with org + session lands in that session', async ({
    signedInPage,
    seededSession,
  }) => {
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('new-design-button').click();
    await signedInPage.getByTestId('new-design-dialog').waitFor();
    await signedInPage.getByTestId(`destination-org-${seededSession.orgId}`).click();
    await signedInPage.getByTestId(`session-option-${seededSession.sessionId}`).click();
    await signedInPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);

    // Verify the design shows up in the seeded session's detail page.
    // createDesignAction attaches the design to position-0 (skill_building);
    // the session detail page exposes it via the open-model-<stage_type>
    // testid inside the matching stage-card. There is no `design-card-*`
    // testid on session detail today, so we assert on the existing one.
    await signedInPage.goto(`/app/sessions/${seededSession.sessionId}`);
    await expect(
      signedInPage
        .getByTestId('stage-card-skill_building')
        .getByTestId('open-model-skill_building'),
    ).toBeVisible();
  });

  test('Filter narrows My Designs to a single org', async ({ signedInPage, seededSession }) => {
    // 1. Create a personal design via the wizard.
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('new-design-button').click();
    await signedInPage.getByTestId('new-design-dialog').waitFor();
    await signedInPage.getByTestId('destination-personal').click();
    await signedInPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);

    // 2. Create a session-scoped design via the wizard.
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('new-design-button').click();
    await signedInPage.getByTestId('new-design-dialog').waitFor();
    await signedInPage.getByTestId(`destination-org-${seededSession.orgId}`).click();
    await signedInPage.getByTestId(`session-option-${seededSession.sessionId}`).click();
    await signedInPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);

    // 3. Back on My Designs we expect 2 cards.
    await signedInPage.goto('/app/my-designs');
    await expect(signedInPage.getByTestId(/^design-card-/)).toHaveCount(2);

    // 4. Filter to Personal — exactly 1 card.
    await signedInPage.getByTestId('my-designs-filter-button').click();
    await signedInPage.getByRole('option', { name: 'Personal' }).click();
    await expect(signedInPage.getByTestId(/^design-card-/)).toHaveCount(1);
  });

  test('old /app/designs route redirects', async ({ signedInPage }) => {
    const response = await signedInPage.goto('/app/designs');
    expect(response?.status()).toBe(200);
    await expect(signedInPage).toHaveURL(/\/app\/my-designs/);
  });

  test('old /app/sessions route redirects to /app/orgs', async ({ signedInPage }) => {
    await signedInPage.goto('/app/sessions');
    await expect(signedInPage).toHaveURL(/\/app\/orgs/);
  });

  test('Send to a session duplicates the personal design', async ({
    signedInPage,
    seededSession,
  }) => {
    // 1. Create a personal design via the wizard.
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId('new-design-button').click();
    await signedInPage.getByTestId('new-design-dialog').waitFor();
    await signedInPage.getByTestId('destination-personal').click();
    await signedInPage.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const builderUrl = signedInPage.url();
    const sourceId = builderUrl.match(/\/app\/designs\/([0-9a-f-]+)/)?.[1] ?? '';
    expect(sourceId).not.toBe('');

    // 2. Navigate back to My Designs and send to the seeded session.
    await signedInPage.goto('/app/my-designs');
    await signedInPage.getByTestId(`send-${sourceId}`).click();
    await signedInPage.getByTestId('send-to-session-dialog').waitFor();
    await signedInPage.getByTestId(`send-org-${seededSession.orgId}`).click();
    await signedInPage.getByTestId(`send-session-${seededSession.sessionId}`).click();
    // We expect to land on a NEW design id (not the source).
    await signedInPage.waitForURL(new RegExp(`/app/designs/(?!${sourceId})[0-9a-f-]+`));

    // 3. Source design must still be visible under the Personal filter.
    await signedInPage.goto('/app/my-designs?filter=personal');
    await expect(signedInPage.getByTestId(`design-card-${sourceId}`)).toBeVisible();
  });
});
