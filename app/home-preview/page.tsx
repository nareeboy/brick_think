// Yellow-colourway brand preview of the marketing home page.
// Deliberately self-contained: own nav, footer, styles and assets —
// no imports from components/marketing so the live pages are untouched.
import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Kaisei_Decol } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import { VideoPanel } from './VideoPanel';

import './preview.css';

const kaisei = Kaisei_Decol({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-kaisei',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Home preview — BrickThink',
  description: 'Yellow-colourway brand preview of the BrickThink marketing home page.',
  robots: { index: false, follow: false },
};

const GITHUB_URL = 'https://github.com/nareeboy/brick_think';

const STAGES = [
  {
    n: '01',
    name: 'Skill-building',
    duration: '15 min',
    blurb: 'Warm up. Get used to the bricks and how to build a small idea.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '13 min',
    blurb: 'Each person builds alone. Then they share what it means.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb: 'Combine the builds on one canvas. Talk. Decide together.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb: 'Add links and outside forces. Now you see how it all fits.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb: 'Pull out clear rules. Each one points to the bricks that prove it.',
  },
];

const PERSONAS = [
  {
    role: 'Certified LSP facilitator',
    who: 'Solo or agency',
    line: 'Run your paid client workshops online. Same outcomes as the room. Not a blank whiteboard with bricks pasted on it.',
  },
  {
    role: 'Agile coach',
    who: 'Inside a big company',
    line: 'Run retros, working agreements, and strategy sessions with teams in different cities. Two hours, one shared model, a record you can keep.',
  },
  {
    role: 'Head of People or L&D',
    who: 'Director, Head of People',
    line: 'Plan strategy. Form new teams. Settle a new culture. Hear from the quiet people who would never speak up in a normal meeting.',
  },
];

const CANVAS_BRICKS = [
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '6%',
    top: '64%',
    width: '32%',
    ratio: 300 / 190,
  },
  {
    src: '/bricks/block-red-medium-left.png',
    left: '10%',
    top: '40%',
    width: '20%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-yellow-medium.png',
    left: '32%',
    top: '38%',
    width: '20%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-navy-medium-left.png',
    left: '54%',
    top: '46%',
    width: '20%',
    ratio: 180 / 156,
  },
  { src: '/bricks/piece-head.png', left: '40%', top: '8%', width: '13%', ratio: 150 / 161 },
  { src: '/bricks/piece-body.png', left: '40%', top: '22%', width: '13%', ratio: 150 / 158 },
  {
    src: '/bricks/corner-orange-small.png',
    left: '76%',
    top: '62%',
    width: '10%',
    ratio: 100 / 98,
  },
  { src: '/bricks/flower-pink-small.png', left: '74%', top: '24%', width: '10%', ratio: 100 / 94 },
];

const CTA_BRICKS = [
  {
    src: '/bricks/flat-3-orange-medium-left.png',
    left: '4%',
    top: '12%',
    width: '46%',
    ratio: 1268 / 902,
  },
  {
    src: '/bricks/block-navy-medium-left.png',
    left: '70%',
    top: '22%',
    width: '22%',
    ratio: 1059 / 918,
  },
  {
    src: '/bricks/block-yellow-medium.png',
    left: '36%',
    top: '44%',
    width: '24%',
    ratio: 1051 / 913,
  },
  {
    src: '/bricks/block-green-medium-left.png',
    left: '8%',
    top: '68%',
    width: '26%',
    ratio: 1059 / 917,
  },
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '50%',
    top: '70%',
    width: '42%',
    ratio: 1760 / 1112,
  },
];

const WAVE_BARS = [
  6, 14, 22, 30, 18, 36, 42, 24, 28, 18, 30, 24, 14, 32, 26, 20, 30, 38, 22, 14, 28, 18, 24, 16,
];

const LAUNCH_NAMES = [
  'Product Hunt',
  'Startup Fame',
  'LaunchIgniter',
  'Uneed',
  'TinyLaunch',
  'SourceForge',
  'Peerlist',
  'SaaSHub',
  'NickLaunches',
  'BetaList',
];

export default function HomePreviewPage() {
  return (
    <div className={`btp ${kaisei.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <NavBar />
      <main id="preview-main">
        <Hero />
        <MethodologySection />
        <FeatureBento />
        <PersonasSection />
        <FidelitySection />
        <OpenSourceSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

function NavBar() {
  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/home-preview" aria-label="BrickThink home preview">
          <Image
            className="mk"
            src="/brand/preview/lockup-bar-flat.svg"
            unoptimized
            alt="brickthink"
            width={7182}
            height={1000}
          />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <nav aria-label="Preview primary">
            <Link href="/what-is-lsp">What is LSP?</Link>
            <a href="#features">Features</a>
            <Link href="/facilitators">For facilitators</Link>
            <a href="#open-source">Open source</a>
          </nav>
          <Link className="btn small" href="/sign-in">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid">
        <Image
          className="mk hero-mark"
          src="/brand/preview/cluster.svg"
          unoptimized
          alt="BrickThink brick cluster"
          width={4035}
          height={4549}
        />

        <h1>
          Build <span className="a">one model</span> your team believes in,{' '}
          <span className="a">remotely</span>.
        </h1>

        <p className="lede">
          Finally, people who work remotely can take part in real LSP workshops. They build. They
          share what each build means. Five stages, in order, the same flow as the room. No box of
          bricks needed. Not a replacement for being in the room together&mdash;an option for when
          you can&rsquo;t be.
        </p>

        <div className="ctas">
          <Link className="btn" href="/sign-in">
            Run your first session free
            <ArrowRight />
          </Link>
          <a className="btn ghost" href="#methodology">
            See how a session runs
          </a>
        </div>

        <dl>
          {(
            [
              ['57', 'brick pieces, free to use'],
              ['Free platform', 'no card, no caps'],
              ['Open source', 'run your own copy'],
            ] as const
          ).map(([val, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>

        <VideoPanel src="/home-preview-demo.mp4" />
      </div>
    </section>
  );
}

function MethodologySection() {
  return (
    <section className="sec" id="methodology" aria-labelledby="preview-methodology-heading">
      <div className="wrap sec-pad">
        <div className="center-head">
          <p className="tag accent">The five stages</p>
          <h2 id="preview-methodology-heading">
            All five <span className="a">stages</span>. Done <span className="a">right</span>.
          </h2>
          <p className="intro">
            Run all five. Run a few. Or run one as a focused exercise. The order, the rules, and the
            timing are the same as in the room.
          </p>
        </div>
        <ol className="rows centered">
          {STAGES.map((s) => (
            <li key={s.n}>
              <span className="n">{s.n}</span>
              <div className="body">
                <p className="name">{s.name}</p>
                <p className="blurb">{s.blurb}</p>
              </div>
              <span className="meta">default &middot; {s.duration}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureBento() {
  return (
    <section className="sec" id="features" aria-labelledby="preview-features-heading">
      <div className="wrap sec-pad">
        <div className="bento-head">
          <div>
            <p className="tag accent">What is in the room</p>
            <h2 id="preview-features-heading" style={{ maxWidth: '22ch' }}>
              Built for <span className="a">facilitators</span>. Not just a{' '}
              <span className="a">whiteboard</span>.
            </h2>
          </div>
          <p className="aside">
            Use your own video tool. BrickThink handles the bricks, the story, and the record. Not
            the call.
          </p>
        </div>

        <div className="bento">
          <article className="fcard span-4 rows-2">
            <p className="lab">canvas</p>
            <h3>A canvas built for the work.</h3>
            <p className="desc">
              Drag, turn, and recolour bricks. Zoom in close, zoom out far. Everyone in the room
              sees the same canvas, in real time. No lag. No fight over who is editing.
            </p>
            <div className="viz">
              <div className="canvas-viz" aria-hidden="true">
                {CANVAS_BRICKS.map((b) => (
                  <span
                    key={b.src}
                    className="brick"
                    style={{
                      left: b.left,
                      top: b.top,
                      width: b.width,
                      aspectRatio: b.ratio,
                      backgroundImage: `url(${b.src})`,
                    }}
                  />
                ))}
                <div className="live-pill">
                  <i />4 cursors live
                </div>
              </div>
            </div>
          </article>

          <article className="fcard span-2">
            <p className="lab">ai assist</p>
            <h3>An AI helper, on your side.</h3>
            <p className="desc">
              Get build prompts from a topic. Spot themes across stories. Draft first-pass rules
              from the system model. Nothing reaches the room until you say yes.
            </p>
            <div className="viz">
              <div className="prompt-viz" aria-hidden="true">
                {[
                  'Suggest 3 stage-2 prompts for a team coming off a failed launch.',
                  'Cluster the 9 narrations from stage 3 into themes.',
                  'Draft principles from the system model. Show source bricks.',
                ].map((p, i) => (
                  <div key={p} className="p">
                    <span className="k">{i + 1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="fcard span-2">
            <p className="lab">story capture</p>
            <h3>The story is the record.</h3>
            <p className="desc">
              Capture text, voice, and video right on the canvas. We write it out for you. Find any
              quote by person or stage.
            </p>
            <div className="viz">
              <div className="narr-viz" aria-hidden="true">
                <div className="rec">
                  <i />
                  recording &middot; 00:42
                </div>
                <div className="wave">
                  {WAVE_BARS.map((bar, i) => (
                    <span key={i} style={{ height: `${bar}px`, opacity: 0.55 + (i % 5) * 0.08 }} />
                  ))}
                </div>
                <p className="quote">
                  &ldquo;&hellip;the part I keep coming back to is the bridge between those two
                  clusters &mdash; that is where the trust actually lives.&rdquo;
                </p>
              </div>
            </div>
          </article>

          <article className="fcard span-3">
            <p className="lab">facilitator tools</p>
            <h3>Set up a session in five minutes.</h3>
            <p className="desc">
              Make a session. Pick your stages. Invite your group. Run the timer, spotlight a build,
              and keep private notes &mdash; all in one place.
            </p>
            <div className="viz">
              <div className="tool-viz" aria-hidden="true">
                <div className="row">
                  <div className="l">
                    <i />
                    Stage 03 &mdash; Shared model
                  </div>
                  <span className="t">17:42</span>
                </div>
                <div className="btns">
                  <button type="button" tabIndex={-1}>
                    Pause
                  </button>
                  <button type="button" tabIndex={-1}>
                    Extend +5
                  </button>
                  <button type="button" tabIndex={-1} className="go">
                    Advance
                  </button>
                </div>
                <div className="roster">
                  <RosterPill name="Maren" color="#3b6f8a" />
                  <RosterPill name="Idris" color="#8A6900" />
                  <RosterPill name="Yuki" color="#8a9a78" />
                  <RosterPill name="Tomás" color="#5b3a8a" />
                  <span className="more">+5</span>
                </div>
              </div>
            </div>
          </article>

          <article className="fcard span-3">
            <p className="lab">outputs</p>
            <h3>Walk away with a record, not a screenshot.</h3>
            <p className="desc">
              Export a PDF report. Save each stage as an image. Take the whole session with you
              &mdash; no lock-in.
            </p>
            <div className="viz">
              <div className="exp-viz" aria-hidden="true">
                {(
                  [
                    ['PDF', 'session-report.pdf', '24 pages · 4.2 MB'],
                    ['JSON', 'session-state.json', '1,284 nodes · 318 KB'],
                    ['PNG', 'shared-model.png', '3200×2400'],
                  ] as const
                ).map(([ext, name, meta]) => (
                  <div key={name} className="file">
                    <span className="ext">{ext}</span>
                    <div className="fname">
                      <p className="nm">{name}</p>
                      <p className="mt">{meta}</p>
                    </div>
                    <ArrowDown />
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="fcard span-6">
            <p className="lab">accessibility</p>
            <h3>Works for every person in the room.</h3>
            <p className="desc">
              Stops the motion if a person asks. Works with a keyboard. Screen readers name every
              brick. Our colours work for colour-blind people, with patterns to back them up.
            </p>
            <div className="viz">
              <div className="a11y-viz" aria-hidden="true">
                <div className="cell">
                  <p className="lab" style={{ color: 'var(--fg-2)' }}>
                    Screen reader
                  </p>
                  <p>
                    &ldquo;Brick 2&times;4, terracotta with diagonal hatch pattern, position B6,
                    owned by Idris.&rdquo;
                  </p>
                </div>
                <div className="cell">
                  <p className="lab" style={{ color: 'var(--fg-2)' }}>
                    Voice-described build
                  </p>
                  <p>
                    Spoken description is transcribed and presented as a text-equivalent artefact
                    alongside the visual model.
                  </p>
                </div>
                <div className="cell">
                  <p className="lab" style={{ color: 'var(--fg-2)' }}>
                    Adjustable timer
                  </p>
                  <div className="chips">
                    <span>Strict</span>
                    <span className="on">Standard</span>
                    <span>No pressure</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function RosterPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="pill">
      <i style={{ background: color }} />
      {name}
    </span>
  );
}

function PersonasSection() {
  return (
    <section className="sec" aria-labelledby="preview-personas-heading">
      <div className="wrap sec-pad">
        <div className="grid-12">
          <div className="col-5">
            <p className="tag accent">Built for</p>
            <h2 id="preview-personas-heading">
              Built for <span className="a">facilitators</span> who take this work{' '}
              <span className="a">seriously</span>.
            </h2>
            <p className="intro">
              You can run LSP in a room. You want the online version to feel the same &mdash; not a
              second-best. That is who this is for.
            </p>
          </div>
          <ul className="rows col-7 personas">
            {PERSONAS.map((p, i) => (
              <li key={p.role}>
                <span className="meta" style={{ gridColumn: 'span 12' }}>
                  Who it is for &middot; {String(i + 1).padStart(2, '0')}
                </span>
                <div className="body" style={{ gridColumn: 'span 12' }}>
                  <p className="name" style={{ fontSize: 19 }}>
                    {p.role}
                  </p>
                  <p
                    className="who mono"
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-2)',
                    }}
                  >
                    {p.who}
                  </p>
                  <p className="blurb" style={{ maxWidth: '58ch' }}>
                    {p.line}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FidelitySection() {
  return (
    <section className="fidelity">
      <div
        className="wrap"
        style={{
          paddingTop: 'clamp(64px,7vw,88px)',
          paddingBottom: 'clamp(64px,7vw,88px)',
        }}
      >
        <div className="center-head">
          <p className="tag">What this is, and is not</p>
          <p className="big">
            BrickThink brings LSP online. The method is open{' '}
            <span className="lic">CC BY-SA 3.0</span>, so anyone can teach it. The LEGO&reg; name
            and brick designs are not. So we made our own 52 tiles. They look different. They feel
            right.
          </p>
        </div>
      </div>
    </section>
  );
}

function OpenSourceSection() {
  return (
    <section className="sec" id="open-source" aria-labelledby="preview-open-source-heading">
      <div className="wrap sec-pad">
        <div className="bento-head">
          <div>
            <p className="tag accent">Open source</p>
            <h2 id="preview-open-source-heading" style={{ maxWidth: '22ch' }}>
              Our <span className="a">platform</span> and virtual sessions are{' '}
              <span className="a">free to use</span>.
            </h2>
          </div>
          <p className="aside">
            Running workshops is free &mdash; on our site or your own copy. You only pay for the
            deliverables we produce, below.
          </p>
        </div>

        <div className="os-cards">
          <div className="os-card">
            <div className="top">
              <p className="t">Use our site</p>
              <span className="chip soft">brickthink.io</span>
            </div>
            <p className="desc">
              Sign in and run unlimited workshops &mdash; no setup, free to facilitate. Your data
              stays in the EU, built for screen readers from day one. You only pay if you want a
              deliverable we produce.
            </p>
            <Link className="btn" href="/sign-in">
              Create a facilitator account
              <ArrowRight />
            </Link>
          </div>

          <div className="os-card dark">
            <div className="top">
              <p className="t">Run your own copy</p>
              <span className="chip hot">Apache 2.0</span>
            </div>
            <p className="desc">
              Run it on your own servers. Your data, your rules. Same five stages. Bug reports and
              pull requests welcome.
            </p>
            <a className="btn on-dark" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GitHubGlyph />
              View on GitHub
            </a>
          </div>
        </div>

        <p className="legal-line">Apache 2.0 &middot; LSP method used under CC BY-SA 3.0</p>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section>
      <div className="wrap sec-pad">
        <div className="cta-band">
          <div className="bricks" aria-hidden="true">
            {CTA_BRICKS.map((b) => (
              <span
                key={b.src}
                style={{
                  left: b.left,
                  top: b.top,
                  width: b.width,
                  aspectRatio: b.ratio,
                  backgroundImage: `url(${b.src})`,
                }}
              />
            ))}
          </div>
          <div className="inner">
            <p className="tag accent">Open source &middot; free platform</p>
            <h2>Run your first session free.</h2>
            <p>
              All stages. All features. No card. No caps. The platform is free and open source
              &mdash; you only pay for the deliverables we produce for you.
            </p>
            <Link className="btn" href="/sign-in">
              Create a facilitator account
              <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="press-band">
        <p className="tag" style={{ fontSize: 10 }}>
          Featured on
        </p>
        <div className="logos">
          <a
            href="https://www.linkedin.com/groups/19163025/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/dach-logo.png"
              alt="LEGO® SERIOUS PLAY® Community DACH"
              width={596}
              height={216}
            />
          </a>
          <a
            href="https://www.play-serious.org/brickthink-virtuelle-haptik-ueberholt-lego/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/play-serious-akademie-logo.png"
              alt="Play Serious Akademie"
              width={340}
              height={156}
            />
          </a>
        </div>
      </div>
      <div className="launch-band">
        <p className="tag" style={{ fontSize: 10 }}>
          Launched on
        </p>
        {/* live badges are external embeds; listed by name on this preview */}
        <div className="names">
          {LAUNCH_NAMES.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link href="/home-preview" aria-label="BrickThink home preview">
              <Image
                className="mk"
                src="/brand/preview/lockup-full.svg"
                unoptimized
                alt="brickthink"
                width={13809}
                height={4470}
              />
            </Link>
            <p>
              Remote-native software for the five-stage LEGO&reg; SERIOUS PLAY&reg; methodology.
              Free and open source under Apache 2.0. Self-hosting costs nothing.
            </p>
            <div className="socials">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on GitHub"
              >
                <GitHubGlyph />
              </a>
              <a
                href="https://www.linkedin.com/company/brickthink"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on LinkedIn"
              >
                <LinkedInGlyph />
              </a>
              <a
                href="https://x.com/brick_think"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on X"
              >
                <XGlyph />
              </a>
              <a
                href="https://www.instagram.com/brick_think/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on Instagram"
              >
                <InstagramGlyph />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61591821718165"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on Facebook"
              >
                <FacebookGlyph />
              </a>
              <a
                href="https://www.tiktok.com/@brickthink"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="BrickThink on TikTok"
              >
                <TikTokGlyph />
              </a>
              <a
                href="https://join.slack.com/t/brickthink/shared_invite/zt-3zy9dg1hi-ZVZCdIlfSS_6OYLrQj2R0w"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join the BrickThink community on Slack"
              >
                <SlackGlyph />
              </a>
            </div>
          </div>
          <div className="foot-col">
            <p className="h">The method</p>
            <ul>
              <li>
                <Link href="/what-is-lsp">What is LSP?</Link>
              </li>
              <li>
                <a href="#methodology">Methodology</a>
              </li>
              <li>
                <Link href="/facilitators">For facilitators</Link>
              </li>
              <li>
                <Link href="/articles">Articles</Link>
              </li>
              <li>
                <a
                  href="https://www.lego.com/en-ch/themes/serious-play"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy the Pieces
                </a>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <p className="h">Product</p>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <Link href="/compare/miro">BrickThink vs Miro</Link>
              </li>
              <li>
                <Link href="/roadmap">Roadmap</Link>
              </li>
              <li>
                <Link href="/changelog">Changelog</Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <p className="h">Open source</p>
            <ul>
              <li>
                <a href="#open-source">Why open source</a>
              </li>
              <li>
                <Link href="/self-host">Self-host</Link>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_URL}/blob/main/LICENSE`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Licence (Apache 2.0)
                </a>
              </li>
            </ul>
          </div>
          <div className="foot-status">
            <p className="h">Status</p>
            <Link className="phase" href="/roadmap">
              <i />
              Phase 4 &mdash; Self-host &amp; scale
            </Link>
            <p>WCAG 2.2 AA. GDPR-aligned. EU data residency. Free to self-host.</p>
          </div>
        </div>
      </div>

      <div className="foot-legal">
        <div className="wrap in">
          <nav aria-label="Preview company & legal">
            <Link href="/about">About</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/help">Help &amp; FAQ</Link>
            <Link href="/team">Team</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <div className="fine">
            <p>
              &copy; BrickThink. The LEGO&reg; SERIOUS PLAY&reg; methodology is referenced under CC
              BY-SA 3.0.
            </p>
            <p>
              LEGO&reg;, SERIOUS PLAY&reg;, IMAGINOPEDIA, the Minifigure and the Brick and Knob
              configurations are trademarks of the LEGO Group, which does not sponsor, authorize or
              endorse this product.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- glyphs (local copies — this route stays self-contained) ---------------- */

function ArrowRight() {
  return (
    <svg
      className="arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.236 1.839 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.103.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function SlackGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}
