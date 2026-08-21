import { expect, test } from './fixtures';

// The banner eyebrow names the signed-in account so a projected or shared
// screen makes it obvious whose workspace is on show. A brand-new account has
// no display name yet, so it starts on the email fallback.
test.describe('page banner eyebrow', () => {
  test('names the signed-in account on My Designs and Workshops', async ({
    signedInPage,
    signedInEmail,
  }) => {
    const eyebrow = signedInPage.getByTestId('page-banner-eyebrow');

    await signedInPage.goto('/app/my-designs');
    await expect(eyebrow).toHaveText(`BrickThink - ${signedInEmail}`, { ignoreCase: true });

    await signedInPage.goto('/app/workshops');
    await expect(eyebrow).toHaveText(`BrickThink - ${signedInEmail}`, { ignoreCase: true });

    await signedInPage.goto('/app/account');
    await signedInPage.getByTestId('account-name-input').fill('Ada Lovelace');
    await signedInPage.getByTestId('account-save-button').click();
    await expect(signedInPage.getByText('Saved.')).toBeVisible();

    await signedInPage.goto('/app/my-designs');
    await expect(eyebrow).toHaveText('BrickThink - Ada Lovelace', { ignoreCase: true });

    await signedInPage.goto('/app/workshops');
    await expect(eyebrow).toHaveText('BrickThink - Ada Lovelace', { ignoreCase: true });
  });
});
