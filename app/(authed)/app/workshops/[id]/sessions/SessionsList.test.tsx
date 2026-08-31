import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SessionsList } from './SessionsList';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const base = {
  title: 'Sprint kickoff',
  status: 'draft' as const,
  updated_at: '2026-08-30T10:00:00Z',
};

describe('SessionsList thumbnails', () => {
  it('renders the session design thumbnail when one exists', () => {
    render(
      <SessionsList
        sessions={[{ ...base, id: 's1', thumbnail_url: 'https://s/u1/m1.png?token=a&v=x' }]}
      />,
    );
    const img = screen.getByTestId('session-thumb-s1').querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://s/u1/m1.png?token=a&v=x');
  });

  it('falls back to the dot-grid placeholder, never an external image service', () => {
    const { container } = render(
      <SessionsList sessions={[{ ...base, id: 's2', thumbnail_url: null }]} />,
    );
    expect(screen.getByTestId('session-thumb-s2').querySelector('img')).toBeNull();
    expect(screen.getByTestId('design-thumb-placeholder')).toBeTruthy();
    expect(container.innerHTML).not.toContain('picsum');
  });
});
