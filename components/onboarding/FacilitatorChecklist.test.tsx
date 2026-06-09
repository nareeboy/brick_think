import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

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

const ALL_DONE = {
  hasOrg: true,
  hasSessionInAnyOrg: true,
  hasOwnedSessionDesign: true,
  firstOrgId: 'org-1',
  firstSessionId: 'session-1',
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

  it('re-shows the steps (driven by real progress) in replay mode instead of the complete card', async () => {
    localStorage.setItem('bt_walkthrough_replay', '1');
    localStorage.setItem('bt_checklist_celebrated', ALL_CELEBRATED);
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    expect(await screen.findByTestId('onboarding-checklist')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-checklist-complete')).toBeNull();
    // Real progress is all-done, so the steps render ticked (not faked empty).
    expect(screen.getByTestId('onboarding-step-org').getAttribute('data-done')).toBe('1');
  });

  it('fires one confetti burst when steps newly complete past the recorded baseline', async () => {
    // Baseline recorded as "nothing celebrated yet" (a fresh walkthrough).
    localStorage.setItem('bt_walkthrough_replay', '1');
    localStorage.setItem('bt_checklist_celebrated', JSON.stringify([]));
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    await screen.findByTestId('onboarding-checklist');
    expect(celebrateMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('bt_checklist_celebrated')!)).toEqual(
      expect.arrayContaining(['org', 'session', 'model']),
    );
  });

  it('does NOT fire confetti on first sighting of an already-done account (baselines silently)', async () => {
    // No celebrated key yet — an existing completed user opening the app.
    render(<FacilitatorChecklist progress={ALL_DONE} />);
    await screen.findByTestId('onboarding-checklist-complete');
    expect(celebrateMock).not.toHaveBeenCalled();
    // Baseline persisted so future completions still won't retroactively fire.
    expect(localStorage.getItem('bt_checklist_celebrated')).not.toBeNull();
  });
});
