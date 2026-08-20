// app/team/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, MarketingShell } from '@/components/marketing/MarketingChrome';
import { TeamPortrait } from '@/components/marketing/TeamPortrait';
import { JsonLd } from '@/components/seo/JsonLd';
import { teamSchema } from '@/lib/seo/jsonLd';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Team',
  description:
    'The people building BrickThink — research, product, design system and visual design for remote LEGO® SERIOUS PLAY®.',
  path: '/team',
});

interface TeamMember {
  name: string;
  role: string;
  /** Portrait in `public/team/`. Falls back to a monogram tile when absent. */
  photo?: string;
}

// Order is the running order of the grid. Portraits are square crops living in
// public/team/ — see TeamPortrait for the missing-image fallback.
const TEAM: TeamMember[] = [
  { name: 'Naresh Shan', role: 'Founder', photo: '/team/naresh.jpg' },
  { name: 'Dana Patrascoiu', role: 'Head of UX Research', photo: '/team/dana.jpg' },
  { name: 'Odette Jansen', role: 'Product Advisor', photo: '/team/odette.jpg' },
  { name: 'Robin DiCapua', role: 'Design System Program', photo: '/team/robin.jpg' },
  { name: 'Simon Camp', role: 'Graphic & UX Designer', photo: '/team/simon.jpg' },
];

export default function TeamPage() {
  return (
    <MarketingShell>
      <JsonLd data={teamSchema(TEAM)} />
      <Hero />
      <TeamGrid />
      <MoreBand />
    </MarketingShell>
  );
}

function Hero() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-20 md:grid-cols-12 md:items-end md:gap-12 md:pb-20 md:pt-28">
        <div className="md:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            Team
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[72px]">
            The people behind
            <br />
            the <span className="text-[#a8482a]">bricks</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            BrickThink is made by a small, distributed team. These are the people shaping how the
            method looks, reads and feels on screen.
          </p>
        </div>
        <aside className="md:col-span-4">
          <div className="border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Working with us
            </p>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-zinc-600">
              We hire slowly and in the open. Everything we build ships under Apache 2.0, so the
              work is public before the credit is.
            </p>
            <Link
              href="/careers"
              className="mt-5 inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-zinc-900 hover:text-[#a8482a]"
            >
              See open roles
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TeamGrid() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <h2 className="sr-only">The team</h2>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map((member, i) => (
            <li key={member.name}>
              <figure>
                <div className="relative">
                  <TeamPortrait src={member.photo} name={member.name} />
                  <span className="absolute left-4 top-4 rounded-full bg-white/85 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600 backdrop-blur">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <figcaption className="mt-5">
                  <h3 className="font-display text-[22px] font-medium leading-tight tracking-tight text-zinc-950">
                    {member.name}
                  </h3>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    {member.role}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const MORE_CARDS = [
  {
    href: '/about',
    label: 'About',
    title: 'We build one tool. We build it right.',
    body: 'Why BrickThink exists, what we stand for, and how the product is built in the open.',
  },
  {
    href: '/careers',
    label: 'Careers',
    title: 'Build the workshop, brick by brick.',
    body: 'Open roles and what we look for. Remote-first, method-first.',
  },
];

function MoreBand() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {MORE_CARDS.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="group flex h-full cursor-pointer flex-col rounded-[24px] border border-zinc-900/10 bg-white/70 p-8 transition-colors hover:border-zinc-900/20 hover:bg-white md:p-10"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {c.label}
                </span>
                <span className="mt-3 max-w-[24ch] font-display text-[26px] font-medium leading-tight tracking-tight text-zinc-950 md:text-[30px]">
                  {c.title}
                </span>
                <span className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-zinc-600">
                  {c.body}
                </span>
                <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-[#a8482a]">
                  Read more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
