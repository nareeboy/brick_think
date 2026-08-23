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
});
