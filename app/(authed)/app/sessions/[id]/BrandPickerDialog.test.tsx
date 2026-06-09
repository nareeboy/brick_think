import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { BrandProfileSummary } from '@/lib/branding/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// Stub the heavy preview (FontFace/Konva-free) and the editor so the test stays
// focused on picker behaviour.
vi.mock('@/app/(authed)/app/account/branding/LiveBrandPreview', () => ({
  LiveBrandPreview: () => <div data-testid="preview" />,
}));
vi.mock('@/app/(authed)/app/account/branding/BrandProfileEditor', () => ({
  BrandProfileEditor: ({ onSaved }: { onSaved: (id: string) => void }) => (
    <div data-testid="brand-editor">
      <button type="button" onClick={() => onSaved('new-id')}>
        stub save
      </button>
    </div>
  ),
}));

import { BrandPickerDialog } from './BrandPickerDialog';

function profile(id: string, name: string): BrandProfileSummary {
  return {
    id,
    name,
    displayName: `${name} Co`,
    footerContact: null,
    brandColour: '#111111',
    accentColour: '#1d4ed8',
    logoUrl: null,
    headingFont: { kind: 'curated', key: 'inter' },
    bodyFont: { kind: 'curated', key: 'inter' },
    headingFontUrl: null,
    bodyFontUrl: null,
  };
}

const profiles = [profile('p1', 'Acme'), profile('p2', 'Blue')];

afterEach(cleanup);

describe('<BrandPickerDialog>', () => {
  it('renders the default option plus one row per preset, default selected when none chosen', () => {
    render(
      <BrandPickerDialog
        profiles={profiles}
        fontOptions={[]}
        selectedId={null}
        onApply={() => {}}
        onClose={() => {}}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3); // default + 2 presets
    expect(radios[0]!.getAttribute('aria-checked')).toBe('true'); // default
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Blue')).toBeTruthy();
  });

  it('applies the chosen preset only after "Use preset" is clicked', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <BrandPickerDialog
        profiles={profiles}
        fontOptions={[]}
        selectedId={null}
        onApply={onApply}
        onClose={onClose}
      />,
    );

    // Selecting a row alone doesn't apply.
    await userEvent.click(screen.getAllByRole('radio')[1]!); // Acme
    expect(onApply).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Use preset' }));
    expect(onApply).toHaveBeenCalledWith('p1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the brand editor inline when "Add preset" is clicked', async () => {
    render(
      <BrandPickerDialog
        profiles={profiles}
        fontOptions={[]}
        selectedId={null}
        onApply={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Choose branding' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('brand-add-preset'));

    // The editor replaces the picker (single modal at a time).
    expect(screen.getByTestId('brand-editor')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Choose branding' })).toBeNull();
  });
});
