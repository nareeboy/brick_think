import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BuilderBreadcrumb } from './BuilderBreadcrumb';

describe('BuilderBreadcrumb', () => {
  it('renders session title, stage label, and a link back to the session', () => {
    render(
      <BuilderBreadcrumb
        sessionContext={{
          sessionId: '11111111-2222-3333-4444-555555555555',
          sessionTitle: 'Quarterly retro',
          stageType: 'individual_model',
        }}
      />,
    );
    // No @testing-library/jest-dom in this repo — assert via vanilla DOM API.
    const link = screen.getByRole('link', {
      name: /quarterly retro/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/sessions/11111111-2222-3333-4444-555555555555');
    // getByText throws if absent — its return value is the assertion.
    screen.getByText('Individual model');
  });
});
