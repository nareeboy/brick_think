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
    headingFont: { kind: 'curated', key: 'fraunces' },
    bodyFont: { kind: 'curated', key: 'geist' },
    headingFontUrl: null,
    bodyFontUrl: null,
  };
}

const profiles = [profile('p1', 'Acme'), profile('p2', 'Blue')];

function renderPicker(overrides: Partial<Parameters<typeof BrandPickerDialog>[0]> = {}) {
  const props = {
    profiles,
    fontOptions: [],
    selectedId: null,
    currentPdfUrl: null,
    currentBrandId: null,
    generating: false,
    genError: null,
    onGenerate: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<BrandPickerDialog {...props} />);
  return props;
}

afterEach(cleanup);

describe('<BrandPickerDialog>', () => {
  it('renders the default option plus one row per preset, default selected when none chosen', () => {
    renderPicker();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3); // default + 2 presets
    expect(radios[0]!.getAttribute('aria-checked')).toBe('true'); // default
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Blue')).toBeTruthy();
  });

  it('generates with the default (null) when nothing is selected', async () => {
    const { onGenerate } = renderPicker();
    await userEvent.click(screen.getByTestId('brand-generate'));
    expect(onGenerate).toHaveBeenCalledWith(null);
  });

  it('generates with the chosen preset after selecting its row', async () => {
    const { onGenerate } = renderPicker();
    await userEvent.click(screen.getAllByRole('radio')[1]!); // Acme
    await userEvent.click(screen.getByRole('button', { name: 'Generate report' }));
    expect(onGenerate).toHaveBeenCalledWith('p1');
  });

  it('shows the current report download link with its brand, plus a Regenerate action', () => {
    renderPicker({ currentPdfUrl: 'https://example.com/report.pdf', currentBrandId: 'p1' });
    expect(screen.getByRole('link', { name: /download the latest report/i })).toBeTruthy();
    expect(screen.getByText('(Acme)')).toBeTruthy(); // brand the PDF was generated with
    expect(screen.getByRole('button', { name: 'Regenerate report' })).toBeTruthy();
  });

  it('labels the download link as the default brand when none was applied', () => {
    renderPicker({ currentPdfUrl: 'https://example.com/report.pdf', currentBrandId: null });
    expect(screen.getByText('(BrickThink default)')).toBeTruthy();
  });

  it('reflects the generating state and surfaces a generation error', () => {
    renderPicker({ generating: true, genError: 'Upload failed — try again.' });
    const generate = screen.getByTestId('brand-generate');
    expect(generate.getAttribute('disabled')).not.toBeNull();
    expect(generate.textContent).toContain('Generating…');
    expect(screen.getByText('Upload failed — try again.')).toBeTruthy();
  });

  it('opens the brand editor inline when "Add preset" is clicked', async () => {
    renderPicker();
    expect(screen.getByRole('heading', { name: 'Generate report' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('brand-add-preset'));
    expect(screen.getByTestId('brand-editor')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Generate report' })).toBeNull();
  });
});
