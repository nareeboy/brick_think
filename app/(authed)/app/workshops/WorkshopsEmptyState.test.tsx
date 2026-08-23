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

  it('renders the assistant entry between the CTAs and the example blurb when given', () => {
    render(
      <WorkshopsEmptyState
        newWorkshopHref="/app/workshops/new"
        hasExample={false}
        assistantEntry={<a href="/app/assistant">Set up with AI</a>}
      />,
    );
    expect(screen.getByRole('link', { name: /set up with ai/i })).toBeTruthy();
  });

  it('leaves no assistant container when the slot renders nothing (open core)', () => {
    const { container } = render(
      <WorkshopsEmptyState newWorkshopHref="/app/workshops/new" hasExample={false} />,
    );
    const wrapper = container.querySelector('[data-testid="assistant-entry-slot-workshops"]');
    // The wrapper exists but is empty and hidden via Tailwind `empty:hidden`.
    expect(wrapper?.childElementCount ?? 0).toBe(0);
    expect(wrapper?.className).toContain('empty:hidden');
  });
});
