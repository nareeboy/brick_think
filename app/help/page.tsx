import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ArrowRight,
  CtaBricks,
  GITHUB_URL,
  GitHubGlyph,
  MarketingShell,
  PlusGlyph,
} from '@/components/marketing/MarketingChrome';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description:
    'How BrickThink works in practice — getting started, running sessions, accessibility, privacy, and self-hosting.',
};

type Faq = { q: string; a: string };
type FaqGroup = { id: string; label: string; title: string; items: Faq[] };

const GROUPS: FaqGroup[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'First session, step by step',
    items: [
      {
        q: 'Do I need to be a certified LSP facilitator to use BrickThink?',
        a: 'No. Anyone can use it. But this is a method tool, not a blank whiteboard. If you have never been through the five stages, the screen will feel empty. The hosted site is free. The cheapest way to find out is to run one.',
      },
      {
        q: 'How long does it take to set up a session?',
        a: 'Five minutes. Sign up. Make a session. Pick your stages. Paste in your people. Start. Default times are 15, 13, 30, 25, 20 minutes. Change them per stage if you want.',
      },
      {
        q: 'Do people in my room need an account?',
        a: 'Yes — so their stories stick to their name. Magic-link sign-in works fine. No password needed.',
      },
    ],
  },
  {
    id: 'sessions',
    label: 'Sessions',
    title: 'Running a session live',
    items: [
      {
        q: 'Do you replace our video tool?',
        a: 'No. Use your own video tool — Meet, Zoom, Teams, whatever. We handle the bricks, the story, and the record. The video call stays where it is.',
      },
      {
        q: 'What if someone loses their connection mid-session?',
        a: 'Their work is safe. When they reconnect, they jump back in where the rest of the room is. You can also pause the stage from the toolbar while you wait.',
      },
      {
        q: 'Can I run a single stage instead of all five?',
        a: 'Yes. Each session is set up stage by stage. Skipping out of order is allowed by the tool — but it breaks the method. That call is yours.',
      },
      {
        q: 'How many people can join a session?',
        a: 'Eight today. Bigger groups are on the way. Eight is also the top end LSP suggests for one facilitator.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & licence',
    title: 'Free and open source. The hosted site adds optional paid services.',
    items: [
      {
        q: 'How much does BrickThink cost?',
        a: 'The BrickThink app is free and open source (Apache 2.0) and you can self-host it. A few report and branding services — PDF session reports, transcript polishing, white-label and full-findings reports — are not part of the open-source core; they run only on the hosted site at www.brickthink.io, where a subscription covers the per-use cost (PDF rendering and AI tokens).',
      },
      {
        q: 'Is there a Pro plan?',
        a: 'No. There is no Pro plan gating the core product — the open-source app is complete on its own. The hosted site offers the report and branding services as paid add-ons purely to cover what they cost us to run, not to upsell you.',
      },
      {
        q: 'How can I support the project?',
        a: 'Three honest ways. File bugs or pull requests on GitHub. Run sessions and tell other facilitators. Sponsor the repo if your firm wants us to keep going. None of these are needed to use the tool.',
      },
      {
        q: 'Will the LSP method stay openly referenced?',
        a: 'Yes. LSP is open (CC BY-SA 3.0). We keep using it under that licence. Our code stays Apache 2.0.',
      },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    title: 'Built in from day one',
    items: [
      {
        q: 'How well does this work for people with disabilities?',
        a: 'We aim for WCAG 2.2 AA from day one. The brick canvas works with a keyboard. Every button shows a focus ring. We stop motion if a person asks. Our colours work for colour-blind people, with patterns to back them up.',
      },
      {
        q: 'Does the canvas work with a screen reader?',
        a: 'Yes. Each brick has a name, a spot, and an owner. Like: "2x4 terracotta brick, diagonal hatch, B6, made by Idris." Voice-described build mode is coming — that turns the model into a spoken description.',
      },
      {
        q: 'Can I give someone more time on the timer?',
        a: 'Yes. Each stage has three timer modes: strict, standard, no pressure. You set it per session.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & security',
    title: 'Where your data lives',
    items: [
      {
        q: 'Where is my data stored?',
        a: 'In the EU. GDPR rules apply. Session canvases, stories, and exports stay inside your team. They are not shared with anyone else.',
      },
      {
        q: 'Do you use my session data to train AI models?',
        a: 'No. The AI helper only runs on prompts you write. With your consent. We never feed canvas or story content into AI training.',
      },
      {
        q: 'How do I delete a session?',
        a: 'In session settings, pick Delete. The canvas, stories, and exports are gone within 30 days. Backups go too, on the same clock.',
      },
      {
        q: 'How do I report a security issue?',
        a: 'Email security@brickthink.io. We reply within one working day. Please do not open a public GitHub issue for security bugs.',
      },
    ],
  },
  {
    id: 'self-host',
    label: 'Self-host',
    title: 'Run your own copy',
    items: [
      {
        q: 'Can I run my own copy of BrickThink?',
        a: 'Yes. The code is open. Clone the repo. Point it at your own Supabase. Run it on Railway, Fly, or any Node host. The README has the steps.',
      },
      {
        q: 'Do I have to keep my copy open source?',
        a: 'No. The licence (Apache 2.0) lets you change and share on your own terms. If your change might help others, please send a pull request.',
      },
      {
        q: 'Is there paid support for self-hosted copies?',
        a: 'No paid support. We are not planning any. GitHub issues are where we answer. If you need hands-on help, write to us. We will point you at someone who knows the code.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <MarketingShell>
      <Hero />
      <div className="border-b border-zinc-900/5">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 md:grid-cols-12 md:py-24">
          <aside className="md:col-span-3">
            <nav aria-label="Topics" className="sticky top-24 space-y-1">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Topics
              </p>
              {GROUPS.map((g) => (
                <a
                  key={g.id}
                  href={`#${g.id}`}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 text-[14px] text-zinc-700 transition-colors hover:bg-zinc-900/[0.04] hover:text-zinc-950"
                >
                  <span>{g.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700" />
                </a>
              ))}
            </nav>
          </aside>
          <div className="md:col-span-9">
            {GROUPS.map((g, gi) => (
              <section
                key={g.id}
                id={g.id}
                aria-labelledby={`${g.id}-title`}
                className={`scroll-mt-24 ${gi === 0 ? '' : 'mt-16 md:mt-20'}`}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {g.label}
                </p>
                <h2
                  id={`${g.id}-title`}
                  className="mt-3 font-display text-[28px] font-medium leading-tight tracking-[-0.015em] text-zinc-950 md:text-[34px]"
                >
                  {g.title}
                </h2>
                <ul className="mt-6 divide-y divide-zinc-900/10 border-t border-zinc-900/10">
                  {g.items.map((item) => (
                    <li key={item.q}>
                      <details className="group py-5">
                        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[16px] font-medium text-zinc-950 transition-colors hover:text-[#a8482a]">
                          <span className="max-w-[58ch]">{item.q}</span>
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-900/10 bg-white text-zinc-700 transition-transform duration-200 group-open:rotate-45">
                            <PlusGlyph className="h-3.5 w-3.5" />
                          </span>
                        </summary>
                        <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-zinc-700">
                          {item.a}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
      <StillStuck />
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
            Help &amp; FAQ
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            Plain answers.
            <br />
            <span className="text-[#a8482a]">Real ones</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            Most facilitator questions have a short, honest answer. The longer ones live on GitHub.
            If anything below is wrong, file an issue. We treat this page as the source of truth.
          </p>
        </div>
        <aside className="md:col-span-4">
          <div className="rounded-2xl border border-zinc-900/10 bg-white/70 p-6 backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Looking for something specific?
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">
              File a question on GitHub. We answer within a working day. The common ones move up to
              this page.
            </p>
            <a
              href={`${GITHUB_URL}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              <GitHubGlyph className="h-4 w-4" />
              Open an issue
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StillStuck() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="relative overflow-hidden rounded-[32px] border border-zinc-900/10 bg-gradient-to-br from-[#FBF7F1] to-[#F2E8D8] p-10 md:p-14">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <CtaBricks />
          </div>
          <div className="relative grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Still stuck?
              </p>
              <h2 className="mt-3 font-display text-[28px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[36px]">
                Talk to a human.
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-zinc-700">
                We answer support email ourselves. No bot. No outsourcing.
              </p>
            </div>
            <div className="flex items-center md:justify-end">
              <Link
                href="/contact"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                Go to contact
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
