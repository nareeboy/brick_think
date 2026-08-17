import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BuilderBreadcrumb } from './BuilderBreadcrumb';

describe('BuilderBreadcrumb', () => {
  it('renders a bold back link to the session page', () => {
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
      name: /back to session list page/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/sessions/11111111-2222-3333-4444-555555555555');
    // The session title and stage label are no longer rendered in the sidebar.
    expect(screen.queryByText('Quarterly retro')).toBeNull();
    expect(screen.queryByText('Individual model')).toBeNull();
  });
});
