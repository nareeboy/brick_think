'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: (
    <NavIcon>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </NavIcon>
  ),
  articles: (
    <NavIcon>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </NavIcon>
  ),
  changelog: (
    <NavIcon>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </NavIcon>
  ),
  roles: (
    <NavIcon>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </NavIcon>
  ),
  applications: (
    <NavIcon>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </NavIcon>
  ),
  banner: (
    <NavIcon>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </NavIcon>
  ),
  webhooks: (
    <NavIcon>
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
    </NavIcon>
  ),
  designSystem: (
    <NavIcon>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </NavIcon>
  ),
  toast: (
    <NavIcon>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </NavIcon>
  ),
  backToApp: (
    <NavIcon>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </NavIcon>
  ),
  signOut: (
    <NavIcon>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </NavIcon>
  ),
} satisfies Record<string, ReactNode>;

type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

const OVERVIEW: NavItem = {
  href: '/app/admin',
  label: 'Dashboard',
  icon: ICONS.dashboard,
  exact: true,
};

const SECTIONS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: 'Content',
    items: [
      { href: '/app/admin/cms/articles', label: 'Articles', icon: ICONS.articles },
      { href: '/app/admin/changelog', label: 'Changelog', icon: ICONS.changelog },
    ],
  },
  {
    heading: 'Careers',
    items: [
      { href: '/app/admin/careers/roles', label: 'Roles', icon: ICONS.roles },
      { href: '/app/admin/careers/applications', label: 'Applications', icon: ICONS.applications },
    ],
  },
  {
    heading: 'Site',
    items: [
      { href: '/app/admin/banner', label: 'Banner', icon: ICONS.banner },
      { href: '/app/admin/webhooks', label: 'Webhooks', icon: ICONS.webhooks },
    ],
  },
  {
    heading: 'UI Elements',
    items: [
      { href: '/app/admin/design-system', label: 'Design System', icon: ICONS.designSystem },
      { href: '/app/admin/toast-test', label: 'Toast test', icon: ICONS.toast },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SideNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 font-medium transition-colors duration-200 ${
        active
          ? 'bg-[#a8482a]/10 text-[#a8482a]'
          : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900'
      }`}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#a8482a]"
        />
      ) : null}
      <span className={active ? 'text-[#a8482a]' : 'text-zinc-400 group-hover:text-zinc-600'}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function AdminSideNav() {
  const pathname = usePathname() ?? '';
  return (
    <nav className="space-y-6 text-[13px]">
      <SideNavLink item={OVERVIEW} active={isActive(pathname, OVERVIEW)} />
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <div className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {section.heading}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <SideNavLink item={item} active={isActive(pathname, item)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Back-to-app + sign-out block pinned to the bottom of the admin sidebar. */
export function AdminSideNavFooter() {
  return (
    <div className="space-y-0.5 text-[13px]">
      <Link
        href="/app/my-designs"
        className="group flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-900/5 hover:text-zinc-900"
      >
        <span className="text-zinc-400 group-hover:text-zinc-600">{ICONS.backToApp}</span>
        Back to app
      </Link>
      <form action="/auth/sign-out" method="post">
        <button
          type="submit"
          data-testid="sign-out-button"
          className="group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium text-zinc-600 transition-colors duration-200 hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          <span className="text-zinc-400 group-hover:text-zinc-600">{ICONS.signOut}</span>
          Sign out
        </button>
      </form>
    </div>
  );
}

/** Horizontal pill nav for viewports where the sidebar is hidden. */
export function AdminMobileNav() {
  const pathname = usePathname() ?? '';
  const items = [OVERVIEW, ...SECTIONS.flatMap((section) => section.items)];
  return (
    <nav aria-label="Admin sections" className="md:hidden">
      <ul className="flex gap-1.5 overflow-x-auto px-4 py-3 text-[13px] sm:px-6">
        <li className="shrink-0">
          <Link
            href="/app/my-designs"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-900/10 bg-white px-3 py-1.5 font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
          >
            {ICONS.backToApp}
            App
          </Link>
        </li>
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-medium transition-colors duration-200 ${
                  active
                    ? 'border-[#a8482a]/30 bg-[#a8482a]/10 text-[#a8482a]'
                    : 'border-zinc-900/10 bg-white text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0">
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-900/10 bg-white px-3 py-1.5 font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
            >
              {ICONS.signOut}
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
