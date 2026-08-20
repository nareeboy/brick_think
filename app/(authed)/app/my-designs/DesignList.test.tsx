import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import type { AggregateDesignRow } from '@/lib/my-designs/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// Server action module ('use server' + Supabase) — never invoked by these tests.
vi.mock('@/app/(authed)/app/designs/actions', () => ({
  deleteModelAction: vi.fn(),
}));
// The export menu renders Konva-backed download plumbing that is irrelevant to
// how the grid groups its cards.
vi.mock('@/components/exports/ExportMenu', () => ({
  ExportMenu: () => <div data-testid="export-menu-stub" />,
}));

import { DesignList } from './DesignList';

afterEach(() => {
  cleanup();
});

function personal(id: string, title = id): AggregateDesignRow {
  return {
    id,
    title,
    updated_at: '2026-08-20T10:00:00.000Z',
    thumbnail_url: null,
    badge: { kind: 'personal' },
    tags: [],
  };
}

function workshop(id: string, title = id): AggregateDesignRow {
  return {
    id,
    title,
    updated_at: '2026-08-20T10:00:00.000Z',
    thumbnail_url: null,
    badge: {
      kind: 'org-session',
      orgId: 'org-1',
      orgName: 'Acme Workshop',
      sessionId: 'session-1',
      sessionTitle: 'Kickoff session',
    },
    tags: [],
  };
}

function renderList(designs: AggregateDesignRow[]) {
  return render(<DesignList designs={designs} orgs={[]} allTags={[]} />);
}

describe('DesignList grouping', () => {
  it('renders the empty state when there is nothing to group', () => {
    renderList([]);
    expect(screen.getByTestId('my-designs-empty')).toBeTruthy();
    expect(screen.queryByTestId('design-group-personal')).toBeNull();
    expect(screen.queryByTestId('design-group-workshop')).toBeNull();
  });

  it('splits a mixed page into a personal section and a workshop section', () => {
    renderList([workshop('w1'), personal('p1'), workshop('w2')]);

    const personalSection = screen.getByTestId('design-group-personal');
    const workshopSection = screen.getByTestId('design-group-workshop');

    expect(within(personalSection).getByTestId('design-card-p1')).toBeTruthy();
    expect(within(personalSection).queryByTestId('design-card-w1')).toBeNull();
    expect(within(workshopSection).getByTestId('design-card-w1')).toBeTruthy();
    expect(within(workshopSection).getByTestId('design-card-w2')).toBeTruthy();
    expect(within(workshopSection).queryByTestId('design-card-p1')).toBeNull();
  });

  it('orders personal before workshops in the DOM', () => {
    renderList([workshop('w1'), personal('p1')]);
    const sections = screen
      .getByTestId('my-designs-list')
      .querySelectorAll('section[data-testid^="design-group-"]');
    expect(Array.from(sections).map((s) => s.getAttribute('data-testid'))).toEqual([
      'design-group-personal',
      'design-group-workshop',
    ]);
  });

  it('labels each section with a heading and a count', () => {
    renderList([workshop('w1'), workshop('w2'), personal('p1')]);

    expect(screen.getByRole('heading', { name: /personal designs/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /from workshops/i })).toBeTruthy();
    expect(screen.getByTestId('design-group-personal-count').textContent).toBe('1');
    expect(screen.getByTestId('design-group-workshop-count').textContent).toBe('2');
  });

  it('spells out that workshop designs go only when their workshop does', () => {
    renderList([workshop('w1'), personal('p1')]);

    const note = screen.getByTestId('design-group-workshop-note');
    expect(note.textContent).toMatch(/only be deleted when their workshop or session is deleted/i);
    expect(screen.queryByTestId('design-group-personal-note')).toBeNull();
  });

  it('renders only the section that has designs', () => {
    renderList([personal('p1')]);
    expect(screen.getByTestId('design-group-personal')).toBeTruthy();
    expect(screen.queryByTestId('design-group-workshop')).toBeNull();

    cleanup();

    renderList([workshop('w1')]);
    expect(screen.getByTestId('design-group-workshop')).toBeTruthy();
    expect(screen.queryByTestId('design-group-personal')).toBeNull();
  });

  it('keeps the workshop chip on cards but drops the now-redundant personal chip', () => {
    renderList([workshop('w1'), personal('p1')]);

    const badges = screen.getAllByTestId('design-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.textContent).toContain('Acme Workshop');
    expect(badges[0]?.textContent).toContain('Kickoff session');
  });

  it('offers delete on personal cards only', () => {
    renderList([workshop('w1', 'Wall model'), personal('p1', 'Sketch')]);

    expect(screen.getByRole('button', { name: 'Delete Sketch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete Wall model' })).toBeNull();
  });
});
