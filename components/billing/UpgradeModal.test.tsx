import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/app/(authed)/app/account/billing/actions', () => ({
  createSessionCheckout: vi.fn(),
}));

import { createSessionCheckout } from '@/app/(authed)/app/account/billing/actions';
import UpgradeModal from './UpgradeModal';

const mockedCheckout = vi.mocked(createSessionCheckout);

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('<UpgradeModal>', () => {
  it('renders the session_report price (€9) by default', () => {
    render(<UpgradeModal open onClose={() => {}} feature="PDF session reports" sessionId="s1" />);
    expect(screen.getByRole('button', { name: 'Unlock — €9' })).toBeTruthy();
  });

  it.each([
    ['client_ready', '€45'],
    ['full_findings', '€60'],
  ] as const)('derives the unlock price from the %s tier (%s)', (tier, label) => {
    render(
      <UpgradeModal
        open
        onClose={() => {}}
        feature="A branded report"
        sessionId="s1"
        tier={tier}
      />,
    );
    expect(screen.getByRole('button', { name: `Unlock — ${label}` })).toBeTruthy();
  });

  it('forwards the selected tier and sessionId to createSessionCheckout on unlock', async () => {
    // Returns ok:false so the component sets an error instead of navigating
    // (jsdom can't assign window.location.href).
    mockedCheckout.mockResolvedValue({ ok: false, code: 'stripe_error' });
    render(
      <UpgradeModal
        open
        onClose={() => {}}
        feature="Full written findings"
        sessionId="sess-42"
        tier="full_findings"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Unlock — €60' }));

    expect(mockedCheckout).toHaveBeenCalledTimes(1);
    expect(mockedCheckout).toHaveBeenCalledWith('full_findings', 'sess-42');
    expect(await screen.findByText('Could not start checkout. Please try again.')).toBeTruthy();
  });

  it('offers a one-off ladder (€9 + €45) when given multiple tiers, forwarding each', async () => {
    mockedCheckout.mockResolvedValue({ ok: false, code: 'stripe_error' });
    render(
      <UpgradeModal
        open
        onClose={() => {}}
        feature="PDF session reports"
        sessionId="sess-9"
        tiers={['session_report', 'client_ready']}
      />,
    );

    // Both price points are present, and the €45 row names the white-label benefit.
    expect(screen.getByRole('button', { name: 'Unlock — €9' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock — €45' })).toBeTruthy();
    expect(screen.getByText(/white-labelled/i)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Unlock — €45' }));
    expect(mockedCheckout).toHaveBeenCalledWith('client_ready', 'sess-9');
  });

  it('omits the unlock button entirely when no sessionId is given', () => {
    render(<UpgradeModal open onClose={() => {}} feature="PDF session reports" />);
    expect(screen.queryByRole('button', { name: /^Unlock —/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'View plans' })).toBeTruthy();
  });
});
