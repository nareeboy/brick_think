import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createDesignAction } from '@/app/(authed)/app/my-designs/actions';
import { saveOnboardingConfig } from '@/lib/onboarding/actions';

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/app/welcome',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/onboarding/actions', () => ({
  saveOnboardingConfig: vi.fn(),
  setPathwayOutcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
  dismissWelcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

vi.mock('@/app/(authed)/app/my-designs/actions', () => ({
  createDesignAction: vi.fn(),
}));

import { WelcomeFlow } from './WelcomeFlow';

const saveMock = vi.mocked(saveOnboardingConfig);
const createDesignMock = vi.mocked(createDesignAction);

beforeEach(() => {
  saveMock.mockResolvedValue({ ok: true, data: null });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  replaceMock.mockClear();
  pushMock.mockClear();
  saveMock.mockReset();
  createDesignMock.mockReset();
});

function advanceFacilitatorToStep(step: number) {
  fireEvent.click(screen.getByTestId('welcome-option-facilitator'));
  fireEvent.click(screen.getByTestId('welcome-continue'));
  if (step >= 3) {
    fireEvent.click(screen.getByTestId('welcome-option-run_before'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
  }
  if (step >= 4) {
    fireEvent.click(screen.getByTestId('welcome-option-retrospective'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
  }
  if (step >= 5) {
    fireEvent.click(screen.getByTestId('welcome-option-5_8'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
  }
}

describe('WelcomeFlow', () => {
  it('starts at step 1 with Continue disabled until a role is chosen', () => {
    render(<WelcomeFlow />);
    expect(screen.getByTestId('welcome-step-1')).toBeTruthy();
    const cont = screen.getByTestId('welcome-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('welcome-option-facilitator'));
    expect(cont.disabled).toBe(false);
  });

  it('shows no back arrow on step 1, and a working one from step 2', () => {
    render(<WelcomeFlow />);
    expect(screen.queryByTestId('welcome-back')).toBeNull();
    advanceFacilitatorToStep(2);
    expect(screen.getByTestId('welcome-step-2')).toBeTruthy();
    fireEvent.click(screen.getByTestId('welcome-back'));
    expect(screen.getByTestId('welcome-step-1')).toBeTruthy();
  });

  it('ends the flow for participants: saves, marks guest, routes to the hub', async () => {
    render(<WelcomeFlow />);
    fireEvent.click(screen.getByTestId('welcome-option-participant'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/my-designs'));
    expect(saveMock).toHaveBeenCalledWith({ role: 'participant', completed: true });
    expect(localStorage.getItem('bt_role_choice')).toBe('guest');
    expect(localStorage.getItem('bt_tutorial_guest')).toBe('1');
  });

  it('ends the flow for explorers on a fresh personal canvas', async () => {
    createDesignMock.mockResolvedValue('design-9');
    render(<WelcomeFlow />);
    fireEvent.click(screen.getByTestId('welcome-option-explorer'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/app/designs/design-9'));
    expect(saveMock).toHaveBeenCalledWith({ role: 'explorer', completed: true });
    expect(createDesignMock).toHaveBeenCalledWith({ orgId: null, sessionId: null });
    expect(localStorage.getItem('bt_role_choice')).toBe('explorer');
    expect(localStorage.getItem('bt_tutorial_guest')).toBeNull();
  });

  it('gates every required step for facilitators', () => {
    render(<WelcomeFlow />);
    advanceFacilitatorToStep(2);
    const cont = screen.getByTestId('welcome-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('welcome-option-certified'));
    expect(cont.disabled).toBe(false);
  });

  it('states the recommended ceiling when 9 or more is selected', () => {
    render(<WelcomeFlow />);
    advanceFacilitatorToStep(4);
    expect(screen.queryByTestId('welcome-size-note')).toBeNull();
    fireEvent.click(screen.getByTestId('welcome-option-9_plus'));
    expect(screen.getByTestId('welcome-size-note').textContent).toContain('8 builders');
  });

  it('finishes a facilitator run with all answers and queued invites', async () => {
    render(<WelcomeFlow />);
    advanceFacilitatorToStep(5);
    expect(screen.getByTestId('welcome-step-5')).toBeTruthy();
    const input = screen.getByLabelText('Email addresses to invite');
    fireEvent.change(input, { target: { value: 'a@example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'b@example.com' } });
    fireEvent.click(screen.getByTestId('welcome-continue'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/my-designs'));
    expect(saveMock).toHaveBeenCalledWith({
      role: 'facilitator',
      fluency: 'run_before',
      purpose: 'retrospective',
      groupSize: '5_8',
      pendingInvites: ['a@example.com', 'b@example.com'],
      completed: true,
    });
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_fluency')).toBe('run_before');
  });

  it('"Do this later" finishes without queuing invites', async () => {
    render(<WelcomeFlow />);
    advanceFacilitatorToStep(5);
    fireEvent.click(screen.getByTestId('welcome-do-later'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/my-designs'));
    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ pendingInvites: [] }));
  });

  it('shows an error and stays on the flow when saving fails', async () => {
    saveMock.mockResolvedValue({ ok: false, code: 'unauthenticated' });
    render(<WelcomeFlow />);
    fireEvent.click(screen.getByTestId('welcome-option-participant'));
    fireEvent.click(screen.getByTestId('welcome-continue'));
    expect(await screen.findByTestId('welcome-error')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('chips form a radio group and arrow keys move the selection', () => {
    render(<WelcomeFlow />);
    expect(screen.getByRole('radiogroup', { name: 'How will you use BrickThink?' })).toBeTruthy();
    const first = screen.getByTestId('welcome-option-facilitator');
    fireEvent.click(first);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(
      (screen.getByTestId('welcome-option-participant') as HTMLButtonElement).getAttribute(
        'aria-checked',
      ),
    ).toBe('true');
  });
});
