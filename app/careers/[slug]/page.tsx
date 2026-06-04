// app/careers/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApplicationForm } from '@/components/careers/ApplicationForm';
import { MarketingShell } from '@/components/marketing/MarketingChrome';
import { getOpenRoleBySlug } from '@/lib/careers/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const role = await getOpenRoleBySlug(slug);
  if (!role) return { title: 'Role not found' };
  return { title: `${role.title} — Careers`, description: role.summary || undefined };
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = await getOpenRoleBySlug(slug);
  if (!role) notFound();

  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <Link href="/careers" className="text-sm text-[#c0613d] hover:underline">
          ← All roles
        </Link>
        <h1 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950">
          {role.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          {role.location ? <span>{role.location}</span> : null}
          {role.employmentType ? <span>· {role.employmentType}</span> : null}
        </div>

        {role.descriptionMarkdown ? (
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800">
            {role.descriptionMarkdown}
          </div>
        ) : null}

        <div className="mt-12 border-t border-zinc-900/10 pt-10">
          <h2 className="font-display text-2xl text-zinc-950">Apply</h2>
          <p className="mt-1 mb-6 text-sm text-zinc-600">
            Your CV is stored securely and automatically deleted after 7 days.
          </p>
          <ApplicationForm roleId={role.id} roleTitle={role.title} />
        </div>
      </section>
    </MarketingShell>
  );
}
