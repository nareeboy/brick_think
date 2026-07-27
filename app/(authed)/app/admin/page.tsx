import { AdminDashboard } from './AdminDashboard';

export const metadata = {
  title: 'Admin · BrickThink',
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-[14px] text-zinc-600">
          Sign-ups, active users, and site activity at a glance. Figures are placeholder data until
          the dashboard is wired to the database.
        </p>
      </header>

      <AdminDashboard />
    </div>
  );
}
