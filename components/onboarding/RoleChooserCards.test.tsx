import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/app/choose-role',
  useSearchParams: () => new URLSearchParams(''),
}));

import { RoleChooserCards } from './RoleChooserCards';
import { RoleChooserRedirect } from './RoleChooserRedirect';

beforeEach(() => {
  replaceMock.mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('RoleChooserCards', () => {
  it('asks the role question on a fresh browser', async () => {
    render(<RoleChooserCards />);
    expect(await screen.findByTestId('role-chooser')).toBeTruthy();
    expect(screen.getByTestId('role-chooser-facilitator')).toBeTruthy();
    expect(screen.getByTestId('role-chooser-guest')).toBeTruthy();
  });

  it('choosing Facilitator stores the choice and routes home', async () => {
    render(<RoleChooserCards />);
    fireEvent.click(await screen.findByTestId('role-chooser-facilitator'));
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_tutorial_guest')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/app/my-designs');
  });

  it('choosing Guest stores the choice AND the sticky guest flag', async () => {
    render(<RoleChooserCards />);
    fireEvent.click(await screen.findByTestId('role-chooser-guest'));
    expect(localStorage.getItem('bt_role_choice')).toBe('guest');
    expect(localStorage.getItem('bt_tutorial_guest')).toBe('1');
    expect(replaceMock).toHaveBeenCalledWith('/app/my-designs');
  });

  it('bounces straight home when already answered', async () => {
    localStorage.setItem('bt_role_choice', 'guest');
    render(<RoleChooserCards />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/my-designs'));
    expect(screen.queryByTestId('role-chooser')).toBeNull();
  });

  it('bounces server-detected guests home without asking', async () => {
    render(<RoleChooserCards guest />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/app/my-designs'));
    expect(screen.queryByTestId('role-chooser')).toBeNull();
  });
});

describe('RoleChooserRedirect (mocked pathname is /app/choose-role — not a hub)', () => {
  it('never redirects while already on the chooser page', async () => {
    render(<RoleChooserRedirect />);
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled());
  });
});
