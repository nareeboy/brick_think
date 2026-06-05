'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SessionNavLink } from '@/components/app/SessionNavLink';
import type { NavSession } from '@/lib/sessions/navSessions';

const BASE_LINKS = [
  { href: '/app/my-designs', label: 'My Designs' },
  { href: '/app/orgs', label: 'Organisations' },
  { href: '/app/scenarios', label: 'Scenarios' },
] as const;

const ADMIN_LINK = { href: '/app/admin', label: 'Admin' } as const;

interface Props {
  showAdmin?: boolean;
  sessions?: NavSession[];
}

export function HeaderNav({ showAdmin = false, sessions = [] }: Props) {
  const pathname = usePathname() ?? '';

  function renderLink(link: { href: string; label: string }) {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? 'page' : undefined}
        data-testid={link.href === ADMIN_LINK.href ? 'nav-admin' : undefined}
        className={`inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-[13px] font-medium transition-colors ${
          active
            ? 'bg-[#c0613d]/10 text-[#c0613d]'
            : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900'
        }`}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {BASE_LINKS.map(renderLink)}
      <SessionNavLink sessions={sessions} />
      {showAdmin && renderLink(ADMIN_LINK)}
    </nav>
  );
}
