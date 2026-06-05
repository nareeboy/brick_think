import type { ReactNode } from 'react';

interface PageBannerProps {
  /** Page title. A plain string is rendered in the standard heading style; pass
   *  a node when the title needs custom markup (inline rename forms, etc.). */
  title: ReactNode;
  /** data-testid forwarded to the default <h1> (only used when `title` is a string). */
  titleTestId?: string;
  /** Small uppercase line above the title — a label ("BrickThink") or a breadcrumb. */
  eyebrow?: ReactNode;
  /** Supporting copy rendered under the title. */
  subtitle?: ReactNode;
  /** Avatar (or other glyph) shown to the left of the title block. */
  avatar?: ReactNode;
  /** Slot rendered above the eyebrow — e.g. a role chip. */
  leading?: ReactNode;
  /** Right-aligned action controls (buttons, menus). */
  actions?: ReactNode;
  /** Max-width utility so the band's content lines up with the page body below it. */
  maxWidthClassName?: string;
  /** Forwarded to the band wrapper so tour/test anchors keep working. */
  dataTourId?: string;
  dataTestId?: string;
}

/**
 * Full-bleed gradient header band that sits directly under the global nav, in
 * the spirit of Notion's page banner. Holds the page's avatar, title, and
 * actions on a warm terracotta wash; the rest of the page renders below it in
 * the usual cream surface.
 */
export function PageBanner({
  title,
  titleTestId,
  eyebrow,
  subtitle,
  avatar,
  leading,
  actions,
  maxWidthClassName = 'max-w-[1200px]',
  dataTourId,
  dataTestId,
}: PageBannerProps) {
  return (
    <section
      data-tour-id={dataTourId}
      data-testid={dataTestId}
      className="relative isolate overflow-hidden border-b border-[#c0613d]/10 bg-[linear-gradient(108deg,#FAF7F1_0%,#F4E4D5_52%,#EACDB5_100%)]"
    >
      {/* Soft warm glow in the top-right to give the wash some depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#e7a877]/25 blur-3xl"
      />
      <div
        className={`relative mx-auto flex w-full ${maxWidthClassName} flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {avatar ? <div className="shrink-0">{avatar}</div> : null}
          <div className="min-w-0">
            {leading ? <div className="mb-2">{leading}</div> : null}
            {eyebrow ? (
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {eyebrow}
              </div>
            ) : null}
            {typeof title === 'string' ? (
              <h1
                data-testid={titleTestId}
                className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-zinc-950"
              >
                {title}
              </h1>
            ) : (
              title
            )}
            {subtitle ? <div className="mt-1.5 text-[13px] text-zinc-600">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
