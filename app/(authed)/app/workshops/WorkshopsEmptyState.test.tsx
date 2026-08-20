import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { WorkshopsEmptyState } from './WorkshopsEmptyState';

vi.mock('./example-workshop-actions', () => ({
  createExampleWorkshopAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('WorkshopsEmptyState', () => {
  it('offers creating a first workshop', () => {
    render(<WorkshopsEmptyState newWorkshopHref="/app/workshops/new" hasExample={false} />);
    const link = screen.getByRole('link', { name: /new workshop/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/workshops/new');
  });

  it('offers the example workshop as the second way in', () => {
    render(<WorkshopsEmptyState newWorkshopHref="/app/workshops/new" hasExample={false} />);
    expect(screen.getByRole('button', { name: /see an example workshop/i })).toBeTruthy();
  });

  it('carries onboarding params through to the new-workshop link', () => {
    render(
      <WorkshopsEmptyState
        newWorkshopHref="/app/workshops/new?onboarding=create-workshop"
        hasExample={false}
      />,
    );
    const link = screen.getByRole('link', { name: /new workshop/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/app/workshops/new?onboarding=create-workshop');
  });
});
