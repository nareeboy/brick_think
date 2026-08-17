'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SessionNavLink } from '@/components/app/SessionNavLink';
import type { GlobalRole } from '@/lib/account/globalRole';
import type { NavSession } from '@/lib/sessions/navSessions';
import { useEffectiveRole } from '@/components/app/useEffectiveRole';

const BASE_LINKS = [
  { href: '/app/my-designs', label: 'My Designs' },
  { href: '/app/workshops', label: 'Workshops' },
  { href: '/app/scenarios', label: 'Scenarios' },
] as const;

// Guests (invited session participants) only get the home link; Workshops and
// Scenarios are organiser-side surfaces. Their session shows via SessionNavLink.
const GUEST_LINKS = BASE_LINKS.filter((link) => link.href === '/app/my-designs');

// Admin-only links. The admin panel is premium-only: GlobalHeader only sets
// showAdmin when the premium overlay's adminPanelEnabled flag is true.
const ADMIN_LINKS = [{ href: '/app/admin', label: 'Admin' }] as const;

interface Props {
  role: GlobalRole;
  showAdmin?: boolean;
  sessions?: NavSession[];
}

export function HeaderNav({ role, showAdmin = false, sessions = [] }: Props) {
  // The explicit role choice (first-run question / header switcher) overrides
  // the server-derived role, so switching updates the nav immediately.
  const effectiveRole = useEffectiveRole(role);
  const pathname = usePathname() ?? '';

  function renderLink(link: { href: string; label: string }) {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? 'page' : undefined}
        data-testid={link.href === '/app/admin' ? 'nav-admin' : undefined}
        className={`inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-[13px] font-medium transition-colors ${
          active
            ? 'bg-[#a8482a]/10 text-[#a8482a]'
            : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900'
        }`}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {(effectiveRole === 'guest' ? GUEST_LINKS : BASE_LINKS).map(renderLink)}
      <SessionNavLink sessions={sessions} />
      {showAdmin && ADMIN_LINKS.map(renderLink)}
    </nav>
  );
}
