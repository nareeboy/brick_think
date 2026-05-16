import { test, expect } from './fixtures';

// Smoke coverage for the /app/my-designs aggregate index — sort, search,
// tag editor, and the multi-tag filter strip. The heavier behaviours
// (RLS, action-level semantics, normalisation) are covered by the vitest
// integration suite; this spec exercises the URL-driven UI plumbing on
// the real DOM.

test.describe('my-designs sort/search/tags', () => {
  test('the sort dropdown writes ?sort= and reflects the active label', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/my-designs');
    await expect(
      page.getByRole('heading', { name: /my designs/i, level: 1 }),
    ).toBeVisible();

    const sortButton = page.getByTestId('my-designs-sort-button');
    await expect(sortButton).toContainText(/newest/i);

    await sortButton.click();
    await page.getByRole('option', { name: /title a–z/i }).click();
    await expect(page).toHaveURL(/[?&]sort=title-asc/);
    await expect(sortButton).toContainText(/title a–z/i);

    await sortButton.click();
    await page.getByRole('option', { name: /^newest$/i }).click();
    // Default value strips the param entirely.
    await expect(page).not.toHaveURL(/sort=/);
    await expect(sortButton).toContainText(/newest/i);
  });

  test('the search input pushes a debounced ?q= and a clear button resets it', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/my-designs');

    const input = page.getByTestId('my-designs-search');
    await input.fill('refresh-token-shape');
    await expect(page).toHaveURL(/[?&]q=refresh-token-shape/);

    await page.getByTestId('my-designs-search-clear').click();
    await expect(input).toHaveValue('');
    await expect(page).not.toHaveURL(/q=/);
  });

  test('the tag editor adds a tag, the chip appears on the card and the filter strip toggles AND semantics', async ({
    signedInPage: page,
  }) => {
    await page.goto('/app/my-designs');
    await page.getByTestId('new-design-button').click();
    await page.getByTestId('destination-personal').click();

    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const modelId = page.url().match(/designs\/([0-9a-f-]+)/)?.[1];
    expect(modelId).toBeTruthy();

    // Pop back to the aggregate index — don't engage the builder canvas.
    await page.goto('/app/my-designs');
    await expect(page.getByTestId(`design-card-${modelId}`)).toBeVisible();

    // Open the tag editor on the card and add two tags.
    await page.getByTestId(`tag-${modelId}`).click();
    const editor = page.getByTestId(`tag-editor-${modelId}`);
    await expect(editor).toBeVisible();
    const input = page.getByTestId(`tag-editor-input-${modelId}`);
    await input.fill('alpha');
    await input.press('Enter');
    await input.fill('beta');
    await input.press('Enter');
    await page.getByTestId(`tag-editor-save-${modelId}`).click();
    await expect(editor).toBeHidden();

    // Card now carries the chips, and the filter strip surfaces both tags.
    await expect(page.getByTestId(`card-tags-${modelId}`)).toContainText('#alpha');
    await expect(page.getByTestId(`card-tags-${modelId}`)).toContainText('#beta');
    await expect(page.getByTestId('tag-chip-alpha')).toBeVisible();
    await expect(page.getByTestId('tag-chip-beta')).toBeVisible();

    // Single-tag filter: ?tag=alpha leaves the design visible. The URL
    // encoder will percent-encode commas as %2C when present — match either.
    await page.getByTestId('tag-chip-alpha').click();
    await expect(page).toHaveURL(/[?&]tag=alpha(?!(,|%2C))/);
    await expect(page.getByTestId(`design-card-${modelId}`)).toBeVisible();

    // Multi-tag AND: clicking the second chip merges into ?tag=alpha,beta.
    await page.getByTestId('tag-chip-beta').click();
    await expect(page).toHaveURL(/[?&]tag=alpha(,|%2C)beta/);
    await expect(page.getByTestId(`design-card-${modelId}`)).toBeVisible();

    // Toggling alpha off leaves ?tag=beta.
    await page.getByTestId('tag-chip-alpha').click();
    await expect(page).toHaveURL(/[?&]tag=beta(?!(,|%2C))/);

    // "All" clears every active tag.
    await page.getByRole('button', { name: /^all$/i }).click();
    await expect(page).not.toHaveURL(/tag=/);
  });
});
