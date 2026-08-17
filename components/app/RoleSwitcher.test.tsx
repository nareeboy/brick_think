import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RoleSwitcher } from './RoleSwitcher';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('RoleSwitcher', () => {
  it('shows the server role until a client choice exists', async () => {
    render(<RoleSwitcher serverRole="guest" />);
    await waitFor(() =>
      expect(screen.getByTestId('header-role-chip').textContent).toContain('Participant'),
    );
  });

  it('an explicit facilitator choice overrides a server-derived guest', async () => {
    localStorage.setItem('bt_role_choice', 'facilitator');
    render(<RoleSwitcher serverRole="guest" />);
    await waitFor(() =>
      expect(screen.getByTestId('header-role-chip').textContent).toContain('Facilitator'),
    );
  });

  it('switching to Participant stores the guest choice and the sticky flag', async () => {
    localStorage.setItem('bt_role_choice', 'facilitator');
    render(<RoleSwitcher serverRole="facilitator" />);
    fireEvent.click(await screen.findByTestId('header-role-chip'));
    fireEvent.click(await screen.findByTestId('role-switch-participant'));
    expect(localStorage.getItem('bt_role_choice')).toBe('guest');
    expect(localStorage.getItem('bt_tutorial_guest')).toBe('1');
    await waitFor(() =>
      expect(screen.getByTestId('header-role-chip').textContent).toContain('Participant'),
    );
  });

  it('switching to Facilitator clears the sticky guest flag (tutorial resumes)', async () => {
    localStorage.setItem('bt_role_choice', 'guest');
    localStorage.setItem('bt_tutorial_guest', '1');
    render(<RoleSwitcher serverRole="guest" />);
    fireEvent.click(await screen.findByTestId('header-role-chip'));
    fireEvent.click(await screen.findByTestId('role-switch-facilitator'));
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
    expect(localStorage.getItem('bt_tutorial_guest')).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('header-role-chip').textContent).toContain('Facilitator'),
    );
  });

  it('Escape closes the menu without changing anything', async () => {
    localStorage.setItem('bt_role_choice', 'facilitator');
    render(<RoleSwitcher serverRole="facilitator" />);
    fireEvent.click(await screen.findByTestId('header-role-chip'));
    expect(await screen.findByTestId('role-switch-menu')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('role-switch-menu')).toBeNull());
    expect(localStorage.getItem('bt_role_choice')).toBe('facilitator');
  });
});
