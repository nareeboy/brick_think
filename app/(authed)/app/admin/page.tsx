import Link from 'next/link';

export const metadata = {
  title: 'Admin · BrickThink',
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl tracking-tight text-zinc-900">Admin</h1>
        <p className="text-[14px] text-zinc-600">
          Manage site content and configuration. More sections will land here over time.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/app/admin/cms/articles"
            className="group flex h-full flex-col justify-between rounded-2xl border border-zinc-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#a8482a]/30"
          >
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Content
              </div>
              <div className="font-serif text-lg text-zinc-900">Articles</div>
              <p className="text-[13px] text-zinc-600">
                Draft, publish, and manage the site&apos;s article posts. Published articles are
                visible to anyone — drafts stay invisible until you flip the switch.
              </p>
            </div>
            <div className="mt-4 text-[13px] font-medium text-[#a8482a] transition-colors group-hover:underline">
              Open CMS →
            </div>
          </Link>
        </li>
      </ul>
    </div>
  );
}
