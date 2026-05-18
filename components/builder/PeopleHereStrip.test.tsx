import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

import { PeopleHereStrip } from './PeopleHereStrip';
import type { PeerSummary } from '@/lib/yjs/usePeerPresence';

function peer(overrides: Partial<PeerSummary>): PeerSummary {
  return {
    clientId: overrides.clientId ?? 1,
    userId: overrides.userId ?? 'u-x',
    displayName: overrides.displayName ?? 'X',
    avatarUrl: overrides.avatarUrl ?? null,
    color: overrides.color ?? '#c0613d',
    isSelf: overrides.isSelf ?? false,
    selectedBrickId: overrides.selectedBrickId ?? null,
  };
}

describe('PeopleHereStrip', () => {
  it('renders nothing when peers list is empty', () => {
    const { container } = render(<PeopleHereStrip peers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one avatar per peer with self first', () => {
    render(
      <PeopleHereStrip
        peers={[
          peer({ userId: 'u-self', displayName: 'Me', isSelf: true }),
          peer({ userId: 'u-a', displayName: 'Alice' }),
        ]}
      />,
    );
    const avatars = screen.getAllByTestId(/^people-here-avatar-/);
    expect(avatars).toHaveLength(2);
    expect(avatars[0]!.getAttribute('data-testid')).toBe('people-here-avatar-u-self');
  });

  it('renders an <img> when avatarUrl is set', () => {
    render(
      <PeopleHereStrip
        peers={[peer({ userId: 'u-photo', avatarUrl: 'https://example.com/p.png' })]}
      />,
    );
    const avatar = screen.getByTestId('people-here-avatar-u-photo');
    const img = avatar.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/p.png');
  });

  it('falls back to the first letter when avatarUrl is null', () => {
    render(
      <PeopleHereStrip peers={[peer({ userId: 'u-letter', displayName: 'Anika' })]} />,
    );
    expect(
      screen.getByTestId('people-here-initial-u-letter').textContent,
    ).toBe('A');
  });

  it('puts the displayName in the title attribute (hover tooltip)', () => {
    render(
      <PeopleHereStrip
        peers={[peer({ userId: 'u-tip', displayName: 'Maya Robertson' })]}
      />,
    );
    expect(
      screen.getByTestId('people-here-avatar-u-tip').getAttribute('title'),
    ).toBe('Maya Robertson');
  });

  it('collapses peers beyond the 5-visible cap into a +N pill', () => {
    const peers = [
      peer({ userId: 'u-self', isSelf: true, displayName: 'Me' }),
      peer({ userId: 'u-a', displayName: 'A' }),
      peer({ userId: 'u-b', displayName: 'B' }),
      peer({ userId: 'u-c', displayName: 'C' }),
      peer({ userId: 'u-d', displayName: 'D' }),
      peer({ userId: 'u-e', displayName: 'E' }),
      peer({ userId: 'u-f', displayName: 'F' }),
    ];
    render(<PeopleHereStrip peers={peers} />);
    expect(screen.getAllByTestId(/^people-here-avatar-/)).toHaveLength(5);
    const overflow = screen.getByTestId('people-here-overflow');
    expect(overflow.textContent).toBe('+2');
    expect(overflow.getAttribute('title')).toBe('E, F');
  });

  it('does not render the overflow pill when peers fit within the cap', () => {
    render(
      <PeopleHereStrip
        peers={[peer({ userId: 'u-self', isSelf: true }), peer({ userId: 'u-a' })]}
      />,
    );
    expect(screen.queryByTestId('people-here-overflow')).toBeNull();
  });
});
