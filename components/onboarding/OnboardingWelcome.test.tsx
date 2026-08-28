import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
// Mutable per-test routing state, read by the next/navigation mocks.
let mockPathname = '/app/my-designs';
let mockSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

// The server action hits Supabase — always mocked in component tests.
vi.mock('@/app/(authed)/app/my-designs/actions', () => ({
  createDesignAction: vi.fn(),
}));

// markWelcomeSeen / markPathway persist server-side via a fire-and-forget
// dynamic import; resolve it to mocks so nothing lands after jsdom teardown.
vi.mock('@/lib/onboarding/actions', () => ({
  setPathwayOutcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
  dismissWelcome: vi.fn().mockResolvedValue({ ok: true, data: null }),
  saveOnboardingConfig: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

import { OnboardingWelcome } from './OnboardingWelcome';

const createDesignMock = vi.mocked(createDesignAction);

beforeEach(() => {
  mockPathname = '/app/my-designs';
  mockSearch = '';
  // The modal only exists downstream of an explicit Facilitator answer.
  localStorage.setItem('bt_role_choice', 'facilitator');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  pushMock.mockClear();
  createDesignMock.mockReset();
});

describe('OnboardingWelcome', () => {
  it('renders the three pathway cards on a hub page for a first-visit facilitator', async () => {
    render(<OnboardingWelcome />);
    expect(await screen.findByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(screen.getByText('Start building right away')).toBeTruthy();
    expect(screen.getByText('Start your first workshop')).toBeTruthy();
    expect(screen.getByText('Start a session')).toBeTruthy();
  });

  it('offers no AI entry — onboarding surfaces never offer AI setup', async () => {
    render(<OnboardingWelcome />);
    await screen.findByTestId('onboarding-welcome-modal');
    expect(screen.queryByTestId('assistant-entry-slot-onboarding')).toBeNull();
  });

  it('does not render once the welcome flag is set', async () => {
    localStorage.setItem('bt_welcome_seen', '1');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render before the role question has been answered', async () => {
    localStorage.removeItem('bt_role_choice');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render when the role choice is guest', async () => {
    localStorage.setItem('bt_role_choice', 'guest');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render when the sticky tutorial-guest flag is set (survives session deletion)', async () => {
    localStorage.setItem('bt_tutorial_guest', '1');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render for participants', async () => {
    localStorage.setItem('bt_onboarding_role', 'participant');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('does not render off the hub pages without a reprise', async () => {
    mockPathname = '/app/sessions/session-1';
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('stays hidden while a spotlight tour is in flight', async () => {
    mockSearch = 'onboarding=create-workshop';
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('stays hidden on a canvas page until the canvas tutorial has been seen', async () => {
    mockPathname = '/app/designs/design-1';
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('a skipped pathway shows the muted Skipped chip, never a tick', async () => {
    localStorage.setItem('bt_path_build_done', 'skipped');
    render(<OnboardingWelcome />);
    await screen.findByTestId('onboarding-welcome-modal');
    expect(screen.queryByTestId('onboarding-welcome-card-build-done')).toBeNull();
    expect(screen.getByTestId('onboarding-welcome-card-build-skipped')).toBeTruthy();
  });

  it('stops returning once every pathway is terminal without three completions (no finale)', async () => {
    localStorage.setItem('bt_path_build_done', '1');
    localStorage.setItem('bt_path_workshop_done', 'skipped');
    localStorage.setItem('bt_path_session_done', '1');
    render(<OnboardingWelcome />);
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
    // No finale either — the Build together CTA is part of the modal.
    expect(screen.queryByTestId('onboarding-welcome-build-together')).toBeNull();
  });

  it('pathway cards link to their tours and do NOT dismiss the modal', async () => {
    render(<OnboardingWelcome />);
    const workshop = await screen.findByTestId('onboarding-welcome-card-workshop');
    expect(workshop.getAttribute('href')).toBe('/app/workshops?onboarding=create-workshop');
    const session = screen.getByTestId('onboarding-welcome-card-session');
    expect(session.getAttribute('href')).toBe('/app/workshops?onboarding=create-session');
    session.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(session);
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
  });

  it('clicking the dimmed backdrop does NOT dismiss the modal', async () => {
    render(<OnboardingWelcome />);
    await screen.findByTestId('onboarding-welcome-modal');
    fireEvent.click(screen.getByTestId('onboarding-welcome-modal-backdrop'));
    expect(screen.getByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
  });

  it('Skip tutorial asks for confirmation; Close tutorial dismisses for good', async () => {
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-skip'));
    expect(await screen.findByTestId('onboarding-skip-confirm')).toBeTruthy();
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
    fireEvent.click(screen.getByTestId('onboarding-skip-confirm-close'));
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('Go back returns from the confirmation to the modal without dismissing', async () => {
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-skip'));
    fireEvent.click(await screen.findByTestId('onboarding-skip-confirm-back'));
    expect(await screen.findByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(localStorage.getItem('bt_welcome_seen')).toBeNull();
  });

  it('the close button dismisses immediately and persists the flag', async () => {
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-close'));
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('shows the tick on a completed pathway card', async () => {
    localStorage.setItem('bt_path_build_done', '1');
    render(<OnboardingWelcome />);
    expect(await screen.findByTestId('onboarding-welcome-card-build-done')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-welcome-card-workshop-done')).toBeNull();
  });

  it('all three done: centered Build together replaces Skip and dismisses for good', async () => {
    localStorage.setItem('bt_path_build_done', '1');
    localStorage.setItem('bt_path_workshop_done', '1');
    localStorage.setItem('bt_path_session_done', '1');
    render(<OnboardingWelcome />);
    const cta = await screen.findByTestId('onboarding-welcome-build-together');
    expect(screen.queryByTestId('onboarding-welcome-skip')).toBeNull();
    fireEvent.click(cta);
    expect(localStorage.getItem('bt_welcome_seen')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('onboarding-welcome-modal')).toBeNull());
  });

  it('the build card creates a personal design and navigates to its canvas', async () => {
    createDesignMock.mockResolvedValue('design-1');
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-card-build'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/app/designs/design-1'));
    expect(createDesignMock).toHaveBeenCalledWith({ orgId: null, sessionId: null });
    // The tick comes later, from the canvas tutorial — not from the click.
    expect(localStorage.getItem('bt_path_build_done')).toBeNull();
  });

  it('the build card ticks immediately when the canvas tutorial was already seen', async () => {
    localStorage.setItem('bt_canvas_tutorial_seen', '1');
    createDesignMock.mockResolvedValue('design-2');
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-card-build'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/app/designs/design-2'));
    expect(localStorage.getItem('bt_path_build_done')).toBe('1');
  });

  it('shows an error and stays open when design creation fails', async () => {
    createDesignMock.mockRejectedValue(new Error('boom'));
    render(<OnboardingWelcome />);
    fireEvent.click(await screen.findByTestId('onboarding-welcome-card-build'));
    expect(await screen.findByTestId('onboarding-welcome-error')).toBeTruthy();
    expect(screen.getByTestId('onboarding-welcome-modal')).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
