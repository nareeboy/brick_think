import { Avatar } from '@/components/app/Avatar';

interface Props {
  name: string | null;
  avatarUrl: string | null;
  // Optional one-line role/tagline shown under the name. When omitted, a
  // sensible project-aligned default is used so the row never collapses to
  // just a name.
  tagline?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
}

const DEFAULT_TAGLINE = 'Building BrickThink, in the open.';

// Compact byline that sits at the foot of the article body — avatar + name +
// one-line tagline, sitting in a top-bordered band so it reads as a closing
// signature rather than another content section. Marketing voice convention:
// Fraunces upright on the name, Geist on the tagline, no italics, brand
// terracotta accent on the avatar fallback chip.
//
// LinkedIn + personal-site live as icon-only buttons in a small nav on the
// right (or stacked below on narrow viewports). Targets open in a new tab
// with the standard noopener/noreferrer pair.
export function ArticleAuthorByline({
  name,
  avatarUrl,
  tagline,
  linkedinUrl,
  portfolioUrl,
}: Props) {
  if (!name) return null;
  const resolvedTagline = tagline ?? DEFAULT_TAGLINE;
  const hasLinks = Boolean(linkedinUrl ?? portfolioUrl);

  return (
    <section aria-label="About the author">
      <div className="mx-auto max-w-3xl border-t border-zinc-900/10 px-6 py-10 md:py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Written by
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar url={avatarUrl} name={name} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-[20px] font-medium leading-tight tracking-tight text-zinc-950">
                {name}
              </p>
              <p className="mt-0.5 truncate text-[14px] text-zinc-600">{resolvedTagline}</p>
            </div>
          </div>
          {hasLinks ? (
            <nav aria-label={`${name}'s links`} className="flex items-center gap-2">
              {linkedinUrl ? (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} on LinkedIn`}
                  title="LinkedIn"
                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
                >
                  <LinkedInGlyph className="h-4 w-4" />
                </a>
              ) : null}
              {portfolioUrl ? (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name}'s website`}
                  title="Personal site"
                  className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
                >
                  <ExternalSiteGlyph className="h-4 w-4" />
                </a>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LinkedInGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.99 0 1.78-.77 1.78-1.72V1.72C24 .77 23.21 0 22.22 0z" />
    </svg>
  );
}

function ExternalSiteGlyph({ className = '' }: { className?: string }) {
  // A globe outline — reads "personal site" distinct from the LinkedIn mark
  // without leaning on emoji.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18" />
      <path d="M12 3a13.5 13.5 0 0 0 0 18" />
    </svg>
  );
}
