import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

let mockSearch = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { RoleChooser } from './RoleChooser';

beforeEach(() => {
  mockSearch = '';
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('RoleChooser', () => {
  it('asks the role question on a fresh browser', async () => {
    render(<RoleChooser />);
    expect(await screen.findByTestId('role-chooser')).toBeTruthy();
    expect(screen.getByTestId('role-chooser-facilitator')).toBeTruthy();
    expect(screen.getByTestId('role-chooser-guest')).toBeTruthy();
  });

  it('choosing Facilitator stores the choice and dismisses', async () => {
    render(<RoleChooser />);
    fireEvent.click(await screen.findByTestId('role-chooser-facilitator'));
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_tutorial_guest')).toBeNull();
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });

  it('choosing Guest stores the choice AND the sticky guest flag', async () => {
    render(<RoleChooser />);
    fireEvent.click(await screen.findByTestId('role-chooser-guest'));
    expect(localStorage.getItem('bt_role_choice')).toBe('guest');
    expect(localStorage.getItem('bt_tutorial_guest')).toBe('1');
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });

  it('never asks again once answered', async () => {
    localStorage.setItem('bt_role_choice', 'guest');
    render(<RoleChooser />);
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });

  it('skips server-detected guests and sticky guests', async () => {
    const { unmount } = render(<RoleChooser guest />);
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
    unmount();
    localStorage.setItem('bt_tutorial_guest', '1');
    render(<RoleChooser />);
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });

  it('skips users who already dismissed the tutorial (legacy state)', async () => {
    localStorage.setItem('bt_welcome_seen', '1');
    render(<RoleChooser />);
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });

  it('stays out of the way while a tour is in flight', async () => {
    mockSearch = 'onboarding=create-workshop';
    render(<RoleChooser />);
    await waitFor(() => expect(screen.queryByTestId('role-chooser')).toBeNull());
  });
});
