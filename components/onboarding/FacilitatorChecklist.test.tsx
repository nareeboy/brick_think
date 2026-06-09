import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Confetti touches the DOM/canvas — stub it so these render tests stay pure.
vi.mock('@/lib/onboarding/celebrate', () => ({ celebrate: vi.fn() }));

import { FacilitatorChecklist } from './FacilitatorChecklist';

const ALL_DONE = {
  hasOrg: true,
  hasSessionInAnyOrg: true,
  hasOwnedSessionDesign: true,
  firstOrgId: 'org-1',
  firstSessionId: 'session-1',
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('FacilitatorChecklist', () => {
  it('shows the "complete" card when all tasks are done and not replaying', async () => {
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist-complete')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist')).toBeNull();
  });

  it('re-shows the three steps in replay/preview mode even when all tasks are done', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist-complete')).toBeNull();
    expect(screen.getByTestId('onboarding-step-org')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step-session')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step-model')).toBeTruthy();
  });
});
