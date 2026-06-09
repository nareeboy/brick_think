'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  href: string;
  label: string;
}

const TABS: Tab[] = [
  { href: '/app/account', label: 'Settings' },
  { href: '/app/account/billing', label: 'Billing' },
];

/**
 * Sub-navigation for the account area — switches between Settings and Billing.
 * Styled as the segmented pill used elsewhere (e.g. the billing interval toggle).
 * The Billing tab only appears when billing is enabled on this instance
 * (self-host hides the paid surface entirely).
 */
export function AccountTabs({ showBilling }: { showBilling: boolean }) {
  const pathname = usePathname();
  const tabs = showBilling ? TABS : TABS.filter((t) => t.href !== '/app/account/billing');

  // Nothing to switch between (self-host / billing disabled) → no tab bar.
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Account sections"
      className="inline-flex rounded-full border border-zinc-900/15 bg-white p-1 text-sm"
    >
      {tabs.map((tab) => {
        // Billing is active only on its own subtree; Settings owns every other
        // account path (incl. sub-pages like /app/account/branding).
        const onBilling = pathname.startsWith('/app/account/billing');
        const active = tab.href === '/app/account/billing' ? onBilling : !onBilling;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`cursor-pointer rounded-full px-4 py-1.5 transition-colors ${
              active ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:text-zinc-950'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
