// "Featured on Startup Fame" badge for BrickThink. Static webp rendered as a
// plain <a><img>, matching the other marketing badges. Used in the hero "As
// seen on" bar and the footer wall.

const STARTUP_FAME_URL = 'https://startupfa.me/s/brickthink?utm_source=www.brickthink.io';
const STARTUP_FAME_IMG = 'https://startupfa.me/badges/featured-badge.webp';

export function StartupFameBadge({ className = '' }: { className?: string }) {
  return (
    <a
      href={STARTUP_FAME_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STARTUP_FAME_IMG}
        alt="brickthink.io — featured on Startup Fame"
        width={171}
        height={54}
        loading="lazy"
        decoding="async"
        className="h-[54px] w-auto"
      />
    </a>
  );
}
