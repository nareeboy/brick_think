import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/app/(authed)/app/designs/[id]/share-actions', () => ({
  createShareLink: vi.fn(),
  revokeShareLink: vi.fn(),
}));

import { createShareLink, revokeShareLink } from '@/app/(authed)/app/designs/[id]/share-actions';
import { ShareModal } from './ShareModal';

const originalFetch = global.fetch;

function mockListResponse(rows: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ links: rows }),
  } as unknown as Response);
}

afterEach(() => cleanup());
afterAll(() => {
  global.fetch = originalFetch;
});

describe('<ShareModal>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders existing active links and lets the owner copy the URL', async () => {
    mockListResponse([
      {
        id: 'l1',
        token: 'abcdef'.padEnd(43, 'x'),
        created_at: '2026-05-13T00:00:00Z',
        expires_at: null,
      },
    ]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

    render(<ShareModal modelId="m1" open onClose={() => {}} />);
    expect(await screen.findByText(/never expires/i)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/share/'));
  });

  it('creates a new link via the server action and auto-copies it', async () => {
    mockListResponse([]);
    (createShareLink as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'l2',
      token: 'newtoken'.padEnd(43, 'y'),
      expiresAt: null,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

    render(<ShareModal modelId="m1" open onClose={() => {}} />);
    await act(async () => {
      await Promise.resolve();
    });
    await userEvent.click(screen.getByRole('button', { name: /create link/i }));
    expect(createShareLink).toHaveBeenCalledWith('m1', '7d');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/share/'));
  });

  it('revokes a link via the server action and hides the row', async () => {
    mockListResponse([
      {
        id: 'l1',
        token: 'abcdef'.padEnd(43, 'x'),
        created_at: '2026-05-13T00:00:00Z',
        expires_at: null,
      },
    ]);
    (revokeShareLink as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    render(<ShareModal modelId="m1" open onClose={() => {}} />);
    const revokeBtn = await screen.findByRole('button', { name: /revoke/i });
    await userEvent.click(revokeBtn);
    expect(revokeShareLink).toHaveBeenCalledWith('l1', 'm1');
  });
});
