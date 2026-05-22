import type { CoverCredit } from '@/lib/articles/types';

interface Props {
  credit: CoverCredit;
}

// Image-attribution line shown beneath the cover image on /articles/[slug].
// Renders the structured fields as "Photo by <Photographer> on <Source>",
// turning either segment into a link when its companion URL is present. The
// links go to third-party hosts (Unsplash, Pexels, photographer portfolios)
// so they open in a new tab with rel="noopener noreferrer". `nofollow` is
// intentionally NOT set — Unsplash + Pexels guidelines specifically request a
// followable backlink as part of their attribution agreement.
export function CoverCreditLine({ credit }: Props) {
  const { name, url, source, sourceUrl } = credit;
  if (!name && !source) return null;

  return (
    <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-500">
      Photo
      {name ? (
        <>
          {' by '}
          <CreditLink href={url}>{name}</CreditLink>
        </>
      ) : null}
      {source ? (
        <>
          {' on '}
          <CreditLink href={sourceUrl}>{source}</CreditLink>
        </>
      ) : null}
    </p>
  );
}

function CreditLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return <span className="text-zinc-700">{children}</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-700 underline decoration-zinc-300 underline-offset-[3px] transition-colors hover:text-[#c0613d] hover:decoration-[#c0613d]/60"
    >
      {children}
    </a>
  );
}
