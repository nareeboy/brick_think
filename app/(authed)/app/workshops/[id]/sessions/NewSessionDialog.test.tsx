import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { NewSessionDialog } from './NewSessionDialog';

vi.mock('@/app/(authed)/app/sessions/actions', () => ({ createSession: vi.fn() }));

afterEach(() => cleanup());

describe('NewSessionDialog', () => {
  it('renders the assistant entry in its footer when given', () => {
    render(
      <NewSessionDialog
        orgId="00000000-0000-0000-0000-000000000000"
        onClose={() => {}}
        assistantEntry={<a href="/app/assistant">Set up with AI</a>}
      />,
    );
    expect(screen.getByRole('link', { name: /set up with ai/i })).toBeTruthy();
    expect(screen.getByTestId('new-session-form')).toBeTruthy();
  });

  it('renders an empty, collapsible footer when there is no entry', () => {
    render(<NewSessionDialog orgId="00000000-0000-0000-0000-000000000000" onClose={() => {}} />);
    const footer = screen.getByTestId('assistant-entry-slot-new-session');
    expect(footer.childElementCount).toBe(0);
    expect(footer.className).toContain('empty:hidden');
  });
});
