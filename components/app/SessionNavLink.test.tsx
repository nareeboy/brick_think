import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

let pathname = '/app/my-designs';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { SessionNavLink } from './SessionNavLink';

afterEach(() => {
  cleanup();
  pathname = '/app/my-designs';
});

describe('SessionNavLink', () => {
  test('renders nothing when there are no sessions', () => {
    const { container } = render(<SessionNavLink sessions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders a direct link for a single session', () => {
    render(<SessionNavLink sessions={[{ id: 'abc', title: 'My workshop' }]} />);
    const link = screen.getByRole('link', { name: 'Session' });
    expect(link.getAttribute('href')).toBe('/app/sessions/abc');
    // No dropdown trigger in the single case.
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('renders a dropdown for multiple sessions and lists each title', () => {
    render(
      <SessionNavLink
        sessions={[
          { id: 'a', title: 'Alpha' },
          { id: 'b', title: 'Beta' },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /session/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // Menu items are not in the DOM until opened.
    expect(screen.queryByRole('menuitem', { name: 'Alpha' })).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const alpha = screen.getByRole('menuitem', { name: 'Alpha' });
    const beta = screen.getByRole('menuitem', { name: 'Beta' });
    expect(alpha.getAttribute('href')).toBe('/app/sessions/a');
    expect(beta.getAttribute('href')).toBe('/app/sessions/b');
  });

  test('Escape closes the open dropdown', () => {
    render(
      <SessionNavLink
        sessions={[
          { id: 'a', title: 'Alpha' },
          { id: 'b', title: 'Beta' },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /session/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menuitem', { name: 'Alpha' })).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
