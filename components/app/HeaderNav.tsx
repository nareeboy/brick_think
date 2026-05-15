'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/app/orgs', label: 'Organisations' },
  { href: '/app/my-designs', label: 'My Designs' },
] as const;

export function HeaderNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex h-10 cursor-pointer items-center rounded-xl px-3 text-[13px] font-medium transition-colors ${
              active
                ? 'bg-[#c0613d]/10 text-[#c0613d]'
                : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
