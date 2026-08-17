import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const replaceMock = vi.fn();
let mockPathname = '/app/my-designs';
let mockSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { RoleChooserRedirect } from './RoleChooserRedirect';

beforeEach(() => {
  replaceMock.mockClear();
  mockPathname = '/app/my-designs';
  mockSearch = '';
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('RoleChooserRedirect', () => {
  it('sends an unanswered user on a hub page to /app/choose-role', async () => {
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/choose-role'));
  });

  it('does nothing once the question is answered', async () => {
    localStorage.setItem('bt_role_choice', 'facilitator');
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it('does nothing for server-detected or sticky guests', async () => {
    const { unmount } = render(<RoleChooserRedirect guest />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
    unmount();
    localStorage.setItem('bt_tutorial_guest', '1');
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it('does nothing off the hub pages (deep links, sessions, canvases)', async () => {
    mockPathname = '/app/sessions/session-1';
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it('does nothing for users who already dismissed the tutorial', async () => {
    localStorage.setItem('bt_welcome_seen', '1');
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });

  it('stays out of the way while a tour is in flight', async () => {
    mockSearch = 'onboarding=create-workshop';
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });
});
