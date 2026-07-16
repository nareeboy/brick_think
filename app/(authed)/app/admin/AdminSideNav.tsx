'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS: Array<{ heading: string; items: Array<{ href: string; label: string }> }> = [
  {
    heading: 'Content',
    items: [
      { href: '/app/admin/cms/articles', label: 'Articles' },
      { href: '/app/admin/changelog', label: 'Changelog' },
    ],
  },
  {
    heading: 'Careers',
    items: [
      { href: '/app/admin/careers/roles', label: 'Roles' },
      { href: '/app/admin/careers/applications', label: 'Applications' },
    ],
  },
  {
    heading: 'Site',
    items: [{ href: '/app/admin/banner', label: 'Banner' }],
  },
  {
    heading: 'UI Elements',
    items: [{ href: '/app/admin/toast-test', label: 'Toast test' }],
  },
];

export function AdminSideNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="space-y-6 text-[13px]">
      <Link
        href="/app/admin"
        aria-current={pathname === '/app/admin' ? 'page' : undefined}
        className={`block rounded-md px-3 py-2 font-medium ${
          pathname === '/app/admin'
            ? 'bg-[#a8482a]/10 text-[#a8482a]'
            : 'text-zinc-700 hover:bg-zinc-900/5 hover:text-zinc-900'
        }`}
      >
        Overview
      </Link>
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {section.heading}
          </div>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-md px-3 py-2 ${
                      active
                        ? 'bg-[#a8482a]/10 text-[#a8482a]'
                        : 'text-zinc-700 hover:bg-zinc-900/5 hover:text-zinc-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
