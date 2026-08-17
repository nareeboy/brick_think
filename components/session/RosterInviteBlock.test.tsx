import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RosterInviteBlock } from './RosterInviteBlock';

// vitest.config.ts sets globals: false, so @testing-library/react's auto-cleanup
// (which checks `typeof afterEach === 'function'`) doesn't fire. Wire it
// manually — same pattern as StageController.test.tsx.
afterEach(() => cleanup());

const inviteMock = vi.fn();
const rotateMock = vi.fn();

vi.mock('@/app/(authed)/app/sessions/roster-actions', () => ({
  inviteParticipantsByEmailAction: (...args: unknown[]) => inviteMock(...args),
}));
vi.mock('@/app/(authed)/app/sessions/join-actions', () => ({
  rotateJoinCodeAction: (...args: unknown[]) => rotateMock(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

beforeEach(() => {
  inviteMock.mockReset();
  inviteMock.mockResolvedValue({
    ok: true,
    data: { results: [{ email: 'test1@test.com', status: 'sent_invite' }] },
  });
});

function renderBlock() {
  render(<RosterInviteBlock sessionId="session-1" joinCode="ABC123" />);
  return {
    input: screen.getByPlaceholderText('Enter email addresses...'),
    sendButton: screen.getByRole('button', { name: 'Send invites' }) as HTMLButtonElement,
  };
}

describe('RosterInviteBlock', () => {
  it('disables Send invites when nothing has been entered', () => {
    const { sendButton } = renderBlock();
    expect(sendButton.disabled).toBe(true);
  });

  it('enables Send invites while a draft email sits uncommitted in the input', () => {
    const { input, sendButton } = renderBlock();
    fireEvent.change(input, { target: { value: 'test1@test.com' } });
    expect(sendButton.disabled).toBe(false);
  });

  it('sends the uncommitted draft email on click without requiring Enter first', async () => {
    const { input, sendButton } = renderBlock();
    fireEvent.change(input, { target: { value: 'test1@test.com' } });
    fireEvent.click(sendButton);
    await waitFor(() => expect(inviteMock).toHaveBeenCalledWith('session-1', ['test1@test.com']));
  });

  it('merges committed chips with the draft input, without duplicates', async () => {
    const { input, sendButton } = renderBlock();
    fireEvent.change(input, { target: { value: 'a@test.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'b@test.com, a@test.com' } });
    fireEvent.click(sendButton);
    await waitFor(() =>
      expect(inviteMock).toHaveBeenCalledWith('session-1', ['a@test.com', 'b@test.com']),
    );
  });

  it('keeps Send invites disabled for whitespace-only input', () => {
    const { input, sendButton } = renderBlock();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(sendButton.disabled).toBe(true);
  });
});
