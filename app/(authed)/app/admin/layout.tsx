import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { AdminSideNav } from './AdminSideNav';
import { isCallerSiteAdmin } from '@/lib/articles/admin';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await isCallerSiteAdmin();
  if (!isAdmin) {
    redirect('/app/my-designs');
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
      <aside className="hidden w-56 shrink-0 md:block" aria-label="Admin navigation">
        <AdminSideNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
