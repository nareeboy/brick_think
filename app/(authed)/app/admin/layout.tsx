import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AdminMobileNav, AdminSideNav, AdminSideNavFooter } from './AdminSideNav';
import { AdminNavSlot } from '@/lib/premium/client';
import { isCallerSiteAdmin } from '@/lib/articles/admin';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await isCallerSiteAdmin();
  if (!isAdmin) {
    redirect('/app/my-designs');
  }

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="border-b border-zinc-900/5 bg-white/60 md:hidden">
        <AdminMobileNav />
      </div>
      <div className="flex w-full flex-1">
        <aside
          className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col self-start border-r border-zinc-900/5 bg-white/60 md:flex"
          aria-label="Admin navigation"
        >
          <div className="flex items-center gap-2 px-6 pb-4 pt-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a8482a] text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
            </span>
            <div>
              <div className="text-[13px] font-semibold leading-tight text-zinc-900">Admin</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                BrickThink
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <AdminSideNav />
            <AdminNavSlot />
          </div>
          <div className="border-t border-zinc-900/5 px-3 py-3">
            <AdminSideNavFooter />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
