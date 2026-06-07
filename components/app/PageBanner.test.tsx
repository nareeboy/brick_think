import { afterEach, describe, test, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { PageBanner } from './PageBanner';

afterEach(cleanup);

describe('PageBanner', () => {
  // Regression: the banner is a flex item inside the authed layout's
  // `flex flex-col overflow-y-auto` scroll container. Because it has
  // overflow-hidden, its flex min-height resolves to 0, so without shrink-0 a
  // taller-than-viewport page (e.g. the full Scenarios grid) crushes the band
  // to ~1px and the heading/subtitle disappear until a filter shortens the list.
  test('the banner band never shrinks (shrink-0)', () => {
    const { getByTestId } = render(<PageBanner title="Scenarios" dataTestId="bnr" />);
    expect(getByTestId('bnr').className).toContain('shrink-0');
  });

  test('renders the title and subtitle', () => {
    const { getByRole, getByText } = render(
      <PageBanner title="Scenarios" subtitle="Canonical exercises" />,
    );
    expect(getByRole('heading', { level: 1, name: 'Scenarios' })).toBeTruthy();
    expect(getByText('Canonical exercises')).toBeTruthy();
  });
});
