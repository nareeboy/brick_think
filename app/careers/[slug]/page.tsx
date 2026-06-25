// app/careers/[slug]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApplicationForm } from '@/components/careers/ApplicationForm';
import { MarketingShell } from '@/components/marketing/MarketingChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { getOpenRoleBySlug } from '@/lib/careers/queries';
import { sanitizeRoleHtml } from '@/lib/careers/sanitizeHtml';
import { jobPostingSchema } from '@/lib/seo/jsonLd';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const role = await getOpenRoleBySlug(slug);
  if (!role) return { title: 'Role not found' };
  const title = `${role.title} — Careers`;
  const description = role.summary || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/careers/${role.slug}` },
    openGraph: { title: `${title} · BrickThink`, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${title} · BrickThink`, description },
  };
}

export default async function RolePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const role = await getOpenRoleBySlug(slug);
  if (!role) notFound();

  return (
    <MarketingShell>
      <JsonLd
        data={jobPostingSchema({
          slug: role.slug,
          title: role.title,
          summary: role.summary,
          descriptionHtml: role.descriptionHtml,
          location: role.location,
          employmentType: role.employmentType,
          createdAt: role.createdAt,
        })}
      />
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <Link href="/careers" className="text-sm text-[#a8482a] hover:underline">
          ← All roles
        </Link>
        <h1 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950">
          {role.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
          {role.location ? <span>{role.location}</span> : null}
          {role.employmentType ? <span>· {role.employmentType}</span> : null}
        </div>

        {role.descriptionHtml ? (
          // Stored value is already sanitized on save; re-sanitize on render as
          // defense-in-depth (and to neutralize any legacy pre-WYSIWYG rows).
          <div
            className="article-prose mt-8"
            dangerouslySetInnerHTML={{ __html: sanitizeRoleHtml(role.descriptionHtml) }}
          />
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
