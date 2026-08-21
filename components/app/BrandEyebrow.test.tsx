import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { BrandEyebrow } from './BrandEyebrow';

afterEach(cleanup);

describe('BrandEyebrow', () => {
  test('appends the display name to the product name', () => {
    const { container } = render(<BrandEyebrow name="Ada Lovelace" />);
    expect(container.textContent).toBe('BrickThink - Ada Lovelace');
  });

  test('renders the product name alone when no name resolved', () => {
    const { container } = render(<BrandEyebrow name={null} />);
    expect(container.textContent).toBe('BrickThink');
  });

  // A dangling "BrickThink -" reads as a broken label, so a blank name is
  // treated the same as no name at all.
  test('ignores a whitespace-only name', () => {
    const { container } = render(<BrandEyebrow name="   " />);
    expect(container.textContent).toBe('BrickThink');
  });

  test('hides the separator from assistive tech', () => {
    const { container } = render(<BrandEyebrow name="Ada Lovelace" />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('-');
  });
});
