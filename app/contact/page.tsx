import type { Metadata } from 'next';

import {
  ArrowUpRight,
  GITHUB_URL,
  GitHubGlyph,
  MarketingShell,
} from '@/components/marketing/MarketingChrome';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How to reach BrickThink — support, partnerships, security disclosures, press, and the public issue tracker.',
};

type Channel = {
  label: string;
  title: string;
  description: string;
  action: { kind: 'mailto' | 'external' | 'github'; href: string; label: string };
  detail?: string;
};

const CHANNELS: Channel[] = [
  {
    label: 'Support',
    title: 'Help for facilitators and people in your room.',
    description:
      'Day-to-day questions. Running a session. Stuck in the product. Real humans answer. One working day.',
    action: { kind: 'mailto', href: 'mailto:hello@brickthink.io', label: 'hello@brickthink.io' },
    detail: 'Reply within one working day. CET hours.',
  },
  {
    label: 'Partnerships',
    title: 'Workshops, agencies, big teams.',
    description:
      'Certified LSP facilitators running paid workshops. Agencies using us as their tool. HR teams trying us inside a bigger company.',
    action: {
      kind: 'mailto',
      href: 'mailto:partners@brickthink.io',
      label: 'partners@brickthink.io',
    },
  },
  {
    label: 'Security',
    title: 'Found a security bug?',
    description:
      'Send security bugs here, not to a public GitHub issue. We look at it within one working day. We fix it before talking about it.',
    action: {
      kind: 'mailto',
      href: 'mailto:security@brickthink.io',
      label: 'security@brickthink.io',
    },
    detail: 'PGP available on request.',
  },
  {
    label: 'Press',
    title: 'Writers, analysts, podcasts.',
    description:
      'Interviews about the method, the online product, or the open-source side. We do not pay for placement. We do not write your quotes.',
    action: { kind: 'mailto', href: 'mailto:press@brickthink.io', label: 'press@brickthink.io' },
  },
  {
    label: 'Bug reports',
    title: 'File a bug in public.',
    description:
      'Bugs, feature ideas, and chat live on GitHub. Other facilitators can search and find the same question.',
    action: { kind: 'github', href: `${GITHUB_URL}/issues`, label: 'GitHub Issues' },
  },
  {
    label: 'Source',
    title: 'The whole codebase.',
    description:
      'Apache 2.0. Clone it. Fork it. Run your own copy. Or read it to see how the method is built into the data.',
    action: { kind: 'github', href: GITHUB_URL, label: 'github.com/brickthink' },
  },
];

const COMPANY = [
  ['Legal name', 'BrickThink Ltd.'],
  ['Status', 'Open source · always free'],
  ['Where data lives', 'European Union'],
  ['Hosted at', 'www.brickthink.io'],
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <Hero />
      <ChannelsSection />
      <DetailsSection />
    </MarketingShell>
  );
}

function Hero() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-20 md:grid-cols-12 md:items-end md:gap-12 md:pb-20 md:pt-28">
        <div className="md:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Contact
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            We answer
            <br />
            <span className="text-[#c0613d]">our own</span> email.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            No form. No bot. No outsourcing. Pick the right address below and write to a real
            person. We reply within one working day, on CET time.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {COMPANY.map(([label, val]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-[16px] font-medium tracking-tight text-zinc-950">
                  {val}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

function ChannelsSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Channels
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              One address per kind of question.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Pick the right one and you get a faster reply. The wrong one still works — just slower.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          {CHANNELS.map((c, i) => {
            const span =
              i === 0
                ? 'md:col-span-7'
                : i === 1
                  ? 'md:col-span-5'
                  : i === 2
                    ? 'md:col-span-5'
                    : i === 3
                      ? 'md:col-span-7'
                      : i === 4
                        ? 'md:col-span-7'
                        : 'md:col-span-5';
            return (
              <li key={c.label} className={`flex ${span}`}>
                <ChannelCard channel={c} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const Icon = channel.action.kind === 'github' ? GitHubGlyph : ArrowUpRight;
  return (
    <a
      href={channel.action.href}
      target={channel.action.kind === 'mailto' ? undefined : '_blank'}
      rel={channel.action.kind === 'mailto' ? undefined : 'noopener noreferrer'}
      className="group relative flex w-full cursor-pointer flex-col rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)]"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {channel.label}
        </p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-900/10 bg-white text-zinc-700 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-zinc-900/20 group-hover:text-zinc-950">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <h3 className="mt-4 max-w-[32ch] font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
        {channel.title}
      </h3>
      <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-zinc-700">
        {channel.description}
      </p>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-zinc-900/10 pt-5">
        <span className="font-mono text-[12px] text-zinc-900 group-hover:text-[#c0613d]">
          {channel.action.label}
        </span>
        {channel.detail ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {channel.detail}
          </span>
        ) : null}
      </div>
    </a>
  );
}

function DetailsSection() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Working in the open
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[40px]">
            Most conversations happen in public.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-700">
            Roadmap talks, design choices, bug triage, and release notes all live on GitHub. If your
            question is not about money or security, post it there. It helps the next facilitator
            with the same question.
          </p>
        </div>
        <div className="md:col-span-7">
          <ul className="divide-y divide-zinc-900/10 border-y border-zinc-900/10">
            {[
              ['Public roadmap', 'github.com/brickthink/issues?label=roadmap'],
              ['Changelog', 'github.com/brickthink/releases'],
              ['Discussions', 'github.com/brickthink/discussions'],
              ['Status page', 'status.brickthink.io'],
            ].map(([label, value]) => (
              <li
                key={label}
                className="flex flex-col gap-1 py-5 md:flex-row md:items-baseline md:gap-8"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 md:w-40">
                  {label}
                </span>
                <span className="font-mono text-[13px] text-zinc-800">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
