import { expect, test } from './fixtures';

// Open-core boundary: the AI setup assistant exists ONLY in the premium
// overlay. Core must hard-404 the route — no stub, no redirect (the
// admin-panel precedent). The overlay build overwrites this spec with its
// own, which asserts the route exists.
test.describe('assistant boundary (open core)', () => {
  test('/app/assistant hard-404s for a signed-in user', async ({ signedInPage }) => {
    const response = await signedInPage.goto('/app/assistant');
    expect(response?.status()).toBe(404);
  });

  test('the assistant API route does not exist', async ({ signedInPage }) => {
    const response = await signedInPage.request.post('/api/assistant/stream', {
      data: { message: 'hello' },
    });
    expect(response.status()).toBe(404);
  });

  test('no entry point renders on the workshops empty state in open core', async ({
    signedInPage,
  }) => {
    // A fresh signedInPage has zero orgs, so /app/workshops renders
    // WorkshopsEmptyState (the other always-reachable placement). Note this
    // can't share a test with `seededSession`: fixture params are resolved
    // before the test body runs, so the workshop would already exist and
    // this empty-state branch would never render.
    await signedInPage.goto('/app/workshops');
    await expect(
      signedInPage.getByRole('heading', { name: /start your first workshop/i }),
    ).toBeVisible();
    await expect(signedInPage.getByTestId('assistant-entry')).toHaveCount(0);
  });

  test('no entry points render in open core', async ({ signedInPage, seededSession }) => {
    // Fresh user with one seeded workshop: the New Session dialog is the
    // other always-reachable placement.
    await signedInPage.goto(`/app/workshops/${seededSession.orgId}`);
    await signedInPage.getByTestId('open-new-session-dialog').click();
    await expect(signedInPage.getByTestId('new-session-dialog')).toBeVisible();
    await expect(signedInPage.getByTestId('assistant-entry')).toHaveCount(0);
  });
});
