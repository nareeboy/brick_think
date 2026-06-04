// SourceForge "OSS — Users Love Us" review badge. SourceForge's widget script
// (b.sf-syn.com/badge_js) does nothing but inject this static image into a
// `.sf-root` node, so we render it directly as an <a><img>. That avoids a
// client component, a third-party script, and the flash of fallback text the
// widget shows before it runs — and lets the badge appear in as many places as
// we like. Matches ProductHuntBadge. The `r` param is the attribution referrer.

const SF_PROJECT_URL =
  'https://sourceforge.net/projects/brick-think/?pk_campaign=badge&pk_source=vendor';
const SF_BADGE_IMG =
  'https://b.sf-syn.com/badge_img/4101411/oss-users-love-us-white?r=https://www.brickthink.io/';

// The SF seal carries a lot of internal whitespace, so it reads smaller than
// the other badges at a given height. `imgClassName` lets callers size it per
// placement (default footer height; larger in the hero bar).
export function SourceForgeBadge({
  className = '',
  imgClassName = 'h-14 w-auto',
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <a
      href={SF_PROJECT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="brick_think reviews on SourceForge — OSS, users love us"
        width={105}
        height={105}
        loading="lazy"
        decoding="async"
        src={SF_BADGE_IMG}
        className={imgClassName}
      />
    </a>
  );
}
