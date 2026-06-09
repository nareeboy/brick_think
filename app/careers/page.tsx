// app/careers/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, MarketingShell } from '@/components/marketing/MarketingChrome';
import { listOpenRoles } from '@/lib/careers/queries';
import type { RoleListItem } from '@/lib/careers/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Open roles at BrickThink — help us build LEGO® SERIOUS PLAY® for remote teams.',
};

export default async function CareersPage() {
  const roles = await listOpenRoles();
  return (
    <MarketingShell>
      <section className="border-b border-zinc-900/5">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-20 md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            Careers
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[72px]">
            Build the workshop,
            <br />
            <span className="text-[#a8482a]">brick by brick</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            We&apos;re a small team making LEGO® SERIOUS PLAY® work for distributed groups. Open
            roles are listed below.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        {roles.length === 0 ? (
          <p className="text-zinc-600">No open roles right now — check back soon.</p>
        ) : (
          <ul className="divide-y divide-zinc-900/10 border-y border-zinc-900/10">
            {roles.map((role) => (
              <RoleRow key={role.id} role={role} />
            ))}
          </ul>
        )}
      </section>
    </MarketingShell>
  );
}

function RoleRow({ role }: { role: RoleListItem }) {
  return (
    <li>
      <Link
        href={`/careers/${role.slug}`}
        className="group flex flex-col gap-2 py-6 transition-colors hover:bg-zinc-900/[0.02] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h2 className="font-display text-2xl text-zinc-950">{role.title}</h2>
          {role.summary ? <p className="mt-1 text-sm text-zinc-600">{role.summary}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm text-zinc-600">
          {role.location ? <span>{role.location}</span> : null}
          {role.employmentType ? (
            <span className="rounded-full border border-zinc-900/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]">
              {role.employmentType}
            </span>
          ) : null}
          <ArrowRight className="text-[#a8482a] transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </li>
  );
}
