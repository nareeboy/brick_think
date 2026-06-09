import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { celebrate } from '@/lib/onboarding/celebrate';

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

const celebrateMock = vi.mocked(celebrate);

// An account that has already completed all three funnel steps.
const ALL_DONE = {
  hasOrg: true,
  hasSessionInAnyOrg: true,
  hasOwnedSessionDesign: true,
  firstOrgId: 'org-1',
  firstSessionId: 'session-1',
  orgCount: 1,
  sessionCount: 1,
  ownedSessionDesignCount: 1,
};

const ALL_CELEBRATED = JSON.stringify(['org', 'session', 'model']);

afterEach(() => {
  cleanup();
  localStorage.clear();
  celebrateMock.mockClear();
});

describe('FacilitatorChecklist', () => {
  it('shows the "complete" card when all tasks are done and not replaying', async () => {
    localStorage.setItem('bt_checklist_celebrated', ALL_CELEBRATED);
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist-complete')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist')).toBeNull();
  });

  it('shows the steps EMPTY in replay mode for a finished account (baseline == current counts)', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    // Baseline captured at the user's current (all-done) counts.
    localStorage.setItem('bt_checklist_baseline', JSON.stringify({ org: 1, session: 1, model: 1 }));
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist-complete')).toBeNull();
    // Even though the real account is all-done, every step renders empty.
    for (const testid of [
      'onboarding-step-org',
      'onboarding-step-session',
      'onboarding-step-model',
    ]) {
      expect(screen.getByTestId(testid).getAttribute('data-done')).toBe('0');
    }
    expect(celebrateMock).not.toHaveBeenCalled();
  });

  it('ticks a step and fires confetti when a NEW entity is created past the baseline', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    // At replay start the user already had 1 workshop / 1 session / 1 model.
    localStorage.setItem('bt_checklist_baseline', JSON.stringify({ org: 1, session: 1, model: 1 }));
    localStorage.setItem('bt_checklist_celebrated', JSON.stringify([]));
    // Now they've created a brand-new workshop (orgCount 2 > baseline 1); the
    // session/model counts are unchanged, so only the workshop step ticks.
    render(<FacilitatorChecklist progress={{ ...ALL_DONE, orgCount: 2 }} />);
    await screen.findByTestId('onboarding-checklist');
    expect(screen.getByTestId('onboarding-step-org').getAttribute('data-done')).toBe('1');
    // Session/model counts equal the baseline → still empty.
    expect(screen.getByTestId('onboarding-step-session').getAttribute('data-done')).toBe('0');
    await waitFor(() => expect(celebrateMock).toHaveBeenCalledTimes(1));
  });

  it('captures the baseline from current counts on first replay render (no prior baseline)', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    await screen.findByTestId('onboarding-checklist');
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('bt_checklist_baseline')!)).toEqual({
        org: 1,
        session: 1,
        model: 1,
      }),
    );
    // Captured at all-done, so the steps still render empty and nothing fires.
    expect(screen.getByTestId('onboarding-step-org').getAttribute('data-done')).toBe('0');
    expect(celebrateMock).not.toHaveBeenCalled();
  });

  it('does NOT fire confetti on first sighting of an already-done account (baselines silently)', async () => {
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    await screen.findByTestId('onboarding-checklist-complete');
    expect(celebrateMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('bt_checklist_celebrated')).not.toBeNull();
  });
});
