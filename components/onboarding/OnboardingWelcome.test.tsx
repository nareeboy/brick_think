import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createDesignAction } from '@/app/(authed)/app/my-designs/actions';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

// The server action hits Supabase — always mocked in component tests.
vi.mock('@/app/(authed)/app/my-designs/actions', () => ({
  createDesignAction: vi.fn(),
}));

import { OnboardingWelcome } from './OnboardingWelcome';

const createDesignMock = vi.mocked(createDesignAction);

afterEach(() => {
  cleanup();
  localStorage.clear();
  pushMock.mockClear();
  createDesignMock.mockReset();
});

describe('OnboardingWelcome', () => {
  it('renders the three pathway cards for a first-visit facilitator', async () => {
    render(<OnboardingWelcome firstOrgId={null} />);
    expect(await screen.findByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(screen.getByText('Start building right away')).toBeTruthy();
    expect(screen.getByText('Start your first workshop')).toBeTruthy();
    expect(screen.getByText('Start a session')).toBeTruthy();
  });

  it('does not render once the welcome flag is set', async () => {
    localStorage.setItem('bt_welcome_seen', '1');
    render(<OnboardingWelcome firstOrgId={null} />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render for participants', async () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    render(<OnboardingWelcome firstOrgId={null} />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('"Skip tutorial" dismisses the modal and persists the flag', async () => {
    render(<OnboardingWelcome firstOrgId={null} />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-skip'));
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('the close button dismisses the modal and persists the flag', async () => {
    render(<OnboardingWelcome firstOrgId={null} />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-close'));
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('the workshop card links to the workshops page and marks the flag on click', async () => {
    render(<OnboardingWelcome firstOrgId={null} />);
    const card = await screen.findByTestId('onboarding-welcome-card-workshop');
    expect(card.getAttribute('href')).toBe('/app/workshops');
    fireEvent.click(card);
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
  });

  it('the session card deep-links into the first workshop with the create-session spotlight', async () => {
    render(<OnboardingWelcome firstOrgId="org-1" />);
    const card = await screen.findByTestId('onboarding-welcome-card-session');
    expect(card.getAttribute('href')).toBe('/app/workshops/org-1?onboarding=create-session');
  });

  it('the session card falls back to the workshops page when no workshop exists', async () => {
    render(<OnboardingWelcome firstOrgId={null} />);
    const card = await screen.findByTestId('onboarding-welcome-card-session');
    expect(card.getAttribute('href')).toBe('/app/workshops');
  });

  it('the build card creates a personal design and navigates to its canvas', async () => {
    createDesignMock.mockResolvedValue('design-1');
    render(<OnboardingWelcome firstOrgId={null} />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-card-build'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/app/designs/design-1'));
    expect(createDesignMock).toHaveBeenCalledWith({ orgId: null, sessionId: null });
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
  });

  it('shows an error and stays open when design creation fails', async () => {
    createDesignMock.mockRejectedValue(new Error('boom'));
    render(<OnboardingWelcome firstOrgId={null} />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-card-build'));
    expect(await screen.findByTestId('onboarding-welcome-error')).toBeTruthy();
    expect(screen.getByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
