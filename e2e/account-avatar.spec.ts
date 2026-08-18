import { expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

import { test } from './fixtures';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATAR_FIXTURE = path.join(__dirname, 'fixtures', 'avatar.png');

test.describe('account avatar', () => {
  test('upload, propagate to header + my-designs, then remove', async ({ signedInPage }) => {
    await signedInPage.goto('/app/account');

    // Open the upload dialog.
    await signedInPage.getByTestId('avatar-change-button').click();
    await expect(signedInPage.getByTestId('avatar-upload-dialog')).toBeVisible();

    // Set the file via the hidden input.
    await signedInPage.getByTestId('avatar-file-input').setInputFiles(AVATAR_FIXTURE);

    // Save the default centered crop.
    const saveBtn = signedInPage.getByTestId('avatar-upload-save');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Dialog closes; the on-page avatar becomes an <img> pointing at the
    // public bucket URL with a ?v= cache-buster.
    await expect(signedInPage.getByTestId('avatar-upload-dialog')).toBeHidden();
    const accountAvatar = signedInPage.locator('form img[alt]').first();
    await expect(accountAvatar).toBeVisible();
    await expect(accountAvatar).toHaveAttribute(
      'src',
      /\/storage\/v1\/object\/public\/avatars\/[a-f0-9-]+\/avatar\.png\?v=\d+$/,
    );

    // The header no longer renders an avatar (the user block shows plan text
    // instead); propagation is asserted via the My Designs heading avatar.
    await signedInPage.goto('/app/my-designs');

    // My Designs heading avatar: the page header is a PageBanner <section>
    // (not a <header>), so anchor on the avatars-bucket src instead — the only
    // other <img>s inside <main> are model-thumbnails design cards.
    const myDesignsHeadingAvatar = signedInPage
      .locator('main img[src*="/storage/v1/object/public/avatars/"]')
      .first();
    await expect(myDesignsHeadingAvatar).toHaveAttribute(
      'src',
      /\/storage\/v1\/object\/public\/avatars\/[a-f0-9-]+\/avatar\.png\?v=\d+$/,
    );

    // Remove flow.
    await signedInPage.goto('/app/account');
    await signedInPage.getByTestId('avatar-remove-button').click();
    await signedInPage.getByTestId('avatar-remove-confirm').click();

    // Avatar control reverts to an initials <span> (not an <img>).
    await expect(signedInPage.locator('form img[alt]')).toHaveCount(0);
    // My Designs heading reflects the removal after a navigation.
    await signedInPage.goto('/app/my-designs');
    await expect(
      signedInPage.locator('main img[src*="/storage/v1/object/public/avatars/"]'),
    ).toHaveCount(0);
  });

  test('rejects oversize uploads inline', async ({ signedInPage }) => {
    await signedInPage.goto('/app/account');
    await signedInPage.getByTestId('avatar-change-button').click();

    // Synthesise a 6 MB blob in the browser context and dispatch a fake file.
    await signedInPage.evaluate(() => {
      const input = document.querySelector('[data-testid="avatar-file-input"]') as HTMLInputElement;
      const buf = new Uint8Array(6 * 1024 * 1024);
      const file = new File([buf], 'huge.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(signedInPage.getByTestId('avatar-upload-error')).toContainText(/5 MB or smaller/i);
  });
});
