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

  it('re-shows the three steps as empty (not done) in replay/preview mode, even when all tasks are done', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist-complete')).toBeNull();
    // The steps must look like a brand-new user's — empty, not crossed-out —
    // even though the real account progress is all-done.
    for (const testid of [
      'onboarding-step-org',
      'onboarding-step-session',
      'onboarding-step-model',
    ]) {
      expect(screen.getByTestId(testid).getAttribute('data-done')).toBe('0');
    }
  });
});
