import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

import { ExportMenu } from './ExportMenu';

const renderPng = vi.fn(async () => new Blob(['png'], { type: 'image/png' }));
const renderSvg = vi.fn(async () => new Blob(['<svg/>'], { type: 'image/svg+xml' }));
const renderJson = vi.fn(() => new Blob(['{}'], { type: 'application/json' }));

vi.mock('@/lib/exports/png', () => ({
  renderCanvasToPngBlob: (...args: unknown[]) => renderPng(...(args as [])),
}));
vi.mock('@/lib/exports/svg', () => ({
  renderCanvasToSvgBlob: (...args: unknown[]) => renderSvg(...(args as [])),
}));
vi.mock('@/lib/exports/json', () => ({
  buildExportEnvelope: vi.fn(() => ({
    format: 'brickthink.design',
    version: 1,
    exportedAt: '',
    title: 't',
    canvasState: { groups: [], bricks: [] },
  })),
  renderEnvelopeToBlob: (...args: unknown[]) => renderJson(...(args as [])),
}));

beforeEach(() => {
  renderPng.mockClear();
  renderSvg.mockClear();
  renderJson.mockClear();
  // happy-dom ships URL.createObjectURL but defensive stubs ensure
  // the anchor click in triggerDownload doesn't blow up on quirks.
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

// Vitest doesn't auto-call RTL's cleanup; without this each render bleeds
// DOM into the next test and getByRole hits multiple matches.
afterEach(() => {
  cleanup();
});

const stageSource = {
  kind: 'stage' as const,
  stageRef: { current: null },
  canvasState: { groups: [], bricks: [] },
  title: 'Demo',
};

describe('ExportMenu', () => {
  it('renders a trigger button labelled "Download design"', () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    expect(screen.getByRole('button', { name: /download design/i })).toBeTruthy();
  });

  it('opens the menu with three menuitems on click', async () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download design/i }));
    });
    expect(screen.getByRole('menuitem', { name: /png/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /svg/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /json/i })).toBeTruthy();
  });

  it('closes on Escape', async () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download design/i }));
    });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(screen.queryByRole('menuitem', { name: /png/i })).toBeNull();
  });

  it('invokes the PNG renderer when PNG is clicked', async () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download design/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /png/i }));
    });
    expect(renderPng).toHaveBeenCalledTimes(1);
  });

  it('invokes the SVG renderer when SVG is clicked', async () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download design/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /svg/i }));
    });
    expect(renderSvg).toHaveBeenCalledTimes(1);
  });

  it('invokes the JSON envelope renderer when JSON is clicked', async () => {
    render(<ExportMenu source={stageSource} size="builder" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download design/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /json/i }));
    });
    expect(renderJson).toHaveBeenCalledTimes(1);
  });
});
