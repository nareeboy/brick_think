import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { initialsOf, TeamPortrait } from './TeamPortrait';

// next/image needs the Next runtime to build its optimizer URL — stub it down
// to a plain <img> so these tests cover the fallback logic, not the loader.
vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    <img src={src} alt={alt} data-testid="portrait" onError={onError} />
  ),
}));

// `globals: false` means Testing Library never registers its own auto-cleanup,
// so renders would otherwise pile up in the same document across tests.
afterEach(cleanup);

describe('initialsOf', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initialsOf('Dana Patrascoiu')).toBe('DP');
    expect(initialsOf('Robin  DiCapua')).toBe('RD');
  });

  it('handles single-word and empty names', () => {
    expect(initialsOf('Simon')).toBe('S');
    expect(initialsOf('   ')).toBe('');
  });

  it('ignores middle names', () => {
    expect(initialsOf('Odette van der Jansen')).toBe('OJ');
  });
});

describe('TeamPortrait', () => {
  it('renders the monogram when no photo is supplied', () => {
    render(<TeamPortrait name="Simon Camp" />);

    expect(screen.queryByTestId('portrait')).toBeNull();
    expect(screen.getByText('SC')).toBeTruthy();
  });

  it('renders the photo with an empty alt — the figcaption carries the name', () => {
    render(<TeamPortrait name="Simon Camp" src="/team/simon-camp.jpg" />);

    const img = screen.getByTestId('portrait');
    expect(img.getAttribute('src')).toBe('/team/simon-camp.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(screen.queryByText('SC')).toBeNull();
  });

  it('falls back to the monogram when the photo fails to load', () => {
    render(<TeamPortrait name="Simon Camp" src="/team/missing.jpg" />);

    fireEvent.error(screen.getByTestId('portrait'));

    expect(screen.queryByTestId('portrait')).toBeNull();
    expect(screen.getByText('SC')).toBeTruthy();
  });
});
