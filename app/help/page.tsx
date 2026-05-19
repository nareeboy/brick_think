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
    title: 'New facilitator onboarding',
    items: [
      {
        q: 'Do I need to be a certified LSP facilitator to use BrickThink?',
        a: 'No. The product is open to anyone. But BrickThink is a methodology tool, not a generic whiteboard — it will feel underspecified if the person running the session has never been through the five stages. The hosted version is free and unmetered, so the cheapest way to evaluate is to run one.',
      },
      {
        q: 'How long does it take to set up a session?',
        a: 'Five minutes. Create an account, create a session, pick which of the five stages to run, paste a participant list, and start. The default cadence (15 / 13 / 30 / 25 / 20 minutes) is the canonical one; you can override per stage.',
      },
      {
        q: 'Do participants need an account?',
        a: 'They need to be signed in for their narrations to attach to their identity. Magic-link sign-in works — no password required for participants joining a session.',
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
        a: 'No. Pair BrickThink with whatever the team already uses — Meet, Zoom, Teams, Around. We are the build, the narration, and the record. The video call stays where it is.',
      },
      {
        q: 'What happens if a participant loses their connection mid-session?',
        a: 'Their canvas state is durable. Yjs sync resumes when they reconnect; they rejoin the same shared canvas at the position the rest of the room is at. The facilitator can also pause the stage from the toolbar while waiting.',
      },
      {
        q: 'Can I run a single stage instead of all five?',
        a: 'Yes. Each session is configured stage-by-stage. Skipping stages out of order is allowed by the product but breaks the methodology — we leave that judgement to the facilitator.',
      },
      {
        q: 'How many participants can join a session?',
        a: 'Eight today. Larger group sizes are on the roadmap. Eight is also the upper edge of what the methodology recommends for a single facilitator.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & licence',
    title: 'Free now. Free later. Free forever.',
    items: [
      {
        q: 'How much does BrickThink cost?',
        a: 'Nothing. BrickThink is an open-source program — Apache 2.0 on the code, and the hosted version at www.brickthink.io is free for everyone. There is no paid tier and we have no plans to introduce one.',
      },
      {
        q: 'Is there a Pro plan coming?',
        a: 'No. Earlier copy mentioned a future Pro tier; we have since committed to staying free. If priorities change we will say so loudly, not bury it in a pricing page.',
      },
      {
        q: 'How can I support the project?',
        a: 'Three honest ways: file bug reports and PRs on GitHub, run sessions and tell other facilitators about it, or sponsor the repo if your organisation wants the project to keep moving. None of those are required to use the product.',
      },
      {
        q: 'Will the methodology stay openly referenced?',
        a: 'Yes. The Serious Play methodology is published under CC BY-SA 3.0 and we keep referencing it under that licence. Our own code stays Apache 2.0.',
      },
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    title: 'Designed-in, not retro-fitted',
    items: [
      {
        q: 'What is your accessibility target?',
        a: 'WCAG 2.2 AA from day one. The brick canvas is keyboard-navigable, every interactive control has a visible focus ring, prefers-reduced-motion is respected across the product, and our colour palette is colour-blind safe with pattern overlays on brick fills.',
      },
      {
        q: 'Does the canvas work with a screen reader?',
        a: 'Bricks are exposed as named, positioned, owned objects (for example: "2x4 terracotta brick with diagonal hatch, position B6, owned by Idris"). Voice-described build mode — where the model is presented as a spoken text equivalent — is on the roadmap.',
      },
      {
        q: 'Can I lengthen the timer for a participant who needs more time?',
        a: 'Yes. Each stage has a timer-pressure mode: strict, standard, or no pressure. Facilitators can adjust it per session.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & security',
    title: 'Where your data sits and who can see it',
    items: [
      {
        q: 'Where is data stored?',
        a: 'Supabase, in the EU region. GDPR-aligned. Session canvases, narrations, and exports stay inside your org and are not shared with third parties. The methodology references are public.',
      },
      {
        q: 'Do you use participant data to train AI models?',
        a: 'No. Claude calls happen on the facilitator side, on prompts the facilitator writes, with explicit consent — and we do not feed canvas or narration content into training pipelines.',
      },
      {
        q: 'How do I delete a session?',
        a: 'From the session settings, choose Delete. The session canvas, narrations, and exports are removed within 30 days; backups roll off on the same window.',
      },
      {
        q: 'How do I report a security issue?',
        a: 'Email security@brickthink.io and we will respond inside one working day. Please do not file public GitHub issues for security-sensitive reports.',
      },
    ],
  },
  {
    id: 'self-host',
    label: 'Self-host',
    title: 'Run your own copy',
    items: [
      {
        q: 'Can I self-host BrickThink?',
        a: 'Yes. The repo is Apache 2.0. Clone it, point it at your own Supabase project, and deploy the web service and worker service on Railway, Fly, or any Node host. The README walks through it.',
      },
      {
        q: 'Do I have to keep my self-hosted copy open source?',
        a: 'No. Apache 2.0 is permissive — you can modify and re-distribute under your own terms. If you publish changes back upstream, please use a PR so others can benefit.',
      },
      {
        q: 'Is there commercial support for self-hosted deployments?',
        a: 'No paid support today, and we are not planning a paid tier. The community channel is GitHub issues; we triage there. If you need bespoke help, contact us and we will point you at facilitators or contributors familiar with the stack.',
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
                        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[16px] font-medium text-zinc-950 transition-colors hover:text-[#c0613d]">
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
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Help &amp; FAQ
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            Plain answers,
            <br />
            <span className="text-[#c0613d]">concrete ones</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            Most of what facilitators ask us has a short, honest answer. The longer ones live on
            the GitHub repo. If something below is wrong, file an issue — we use this page as the
            source of truth.
          </p>
        </div>
        <aside className="md:col-span-4">
          <div className="rounded-2xl border border-zinc-900/10 bg-white/70 p-6 backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Looking for something specific?
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">
              File a question on the public repo. We triage within a working day and pull common
              ones up to this page.
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
                We answer support email ourselves. No tier-1 outsourcing, no chatbot in front.
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
