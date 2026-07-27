import { redirect } from 'next/navigation';

import { AdminDashboard } from './AdminDashboard';
import { getAdminDashboardStats } from '@/lib/admin/dashboard';

export const metadata = {
  title: 'Admin · BrickThink',
};

export default async function AdminOverviewPage() {
  const stats = await getAdminDashboardStats('7d');
  if (!stats) {
    // Layout already gates on site admin; this is defence-in-depth.
    redirect('/app/my-designs');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-[14px] text-zinc-600">
          Sign-ups, active users, and site activity at a glance.
        </p>
      </header>

      <AdminDashboard initialStats={stats} />
    </div>
  );
}
